import type { SolumState } from "./schema";

export function frameCount(S: SolumState) {
  return Math.max(1, Math.round(S.motion.duration * S.motion.fps));
}

export function buildPython(S: SolumState): string {
  const fr = frameCount(S);
  const layers = S.layers.map((l) => ({
    name: l.name,
    shape: l.shape,
    role: l.role,
    radius: l.radius,
    thickness: l.thickness,
    density: l.density,
    temperature: l.temperature,
    emission: l.emission,
    absorption: l.absorption,
    scattering: l.scattering,
    roughness: l.roughness,
    noise: l.noise,
    transmission: l.transmission,
    tint: l.tint,
  }));
  const sources = S.sources.map((c) => ({
    name: c.name,
    kind: c.kind,
    x: c.x,
    y: c.y,
    z: c.z,
    radius: c.radius,
    temperature: c.temperature,
    emission: c.emission,
    absorption: c.absorption,
    scattering: c.scattering,
    falloff: c.falloff,
    reach: c.reach,
    pulse: c.pulse,
    dirX: c.dirX,
    dirY: c.dirY,
    dirZ: c.dirZ,
    cone: c.cone,
    color: c.color,
  }));
  const modifiers = S.modifiers.filter((m) => m.enabled).map((m) => ({
    name: m.name,
    type: m.type,
    target: m.target,
    amount: m.amount,
    frequency: m.frequency,
    seed: m.seed,
  }));
  const operators = S.operators.filter((o) => o.enabled).map((o) => ({
    name: o.name,
    type: o.type,
    sourceId: o.sourceId,
    pressure: o.pressure,
    expansion: o.expansion,
    temperatureDelta: o.temperatureDelta,
    erosion: o.erosion,
    fragmentation: o.fragmentation,
    particles: o.particles,
    start: o.start,
    length: o.length,
    dirX: o.dirX,
    dirY: o.dirY,
    dirZ: o.dirZ,
  }));

  const coreVex = sources
    .map(
      (c) =>
        `{ vector cp=q-set(${c.x},${c.y},${c.z}); float cr=${c.radius}*${c.reach}; float kd=exp(-pow(length(cp)/(cr+1e-4),${c.falloff}));
  vector dir=set(${c.dirX},${c.dirY},${c.dirZ}); float cone=${c.cone};
  if(cone>0.01 && length(dir)>0.01 && length(cp)>1e-4){ kd *= pow(max(0, dot(normalize(dir), normalize(cp))), 1.0+cone*6.0); }
  emission += kd*${c.emission}*${c.temperature}; temperature += kd*${c.temperature}; absorption += kd*${c.absorption}; scattering += kd*${c.scattering}; pressure += kd*${c.temperature}*0.2; }`,
    )
    .join("\n");

  const layerVex = layers
    .map((l) => {
      const cavity = l.role === "cavity";
      if (cavity) {
        return `{ float lr=${l.radius}; float lt=${l.thickness}; float ld=exp(-pow((radial-lr)/(lt+1e-4),2)); density *= clamp(1.0-ld*0.85, 0.08, 1.0); }`;
      }
      return `{ float lr=${l.radius}; float lt=${l.thickness}; float ld=exp(-pow((radial-lr)/(lt+1e-4),2)); float block=1.15-${l.transmission}*0.55; density += ld*${l.density}; temperature += ld*${l.temperature}; emission += ld*${l.emission}; absorption += ld*${l.absorption}*block; scattering += ld*${l.scattering}; }`;
    })
    .join("\n");

  const modVex = modifiers
    .map((m) => {
      if (m.type === "erosion" || m.type === "displacement") {
        return `{ float mn=noise(q*${m.frequency}+${m.seed}); density *= clamp(1.0-(mn-0.35)*${m.amount}*0.4, 0.15, 1.0); }`;
      }
      if (m.type === "turbulence" || m.type === "flow") {
        return `{ vector tv=curlnoise(q*${m.frequency}+${m.seed})*${m.amount}; vel += tv; emission += length(tv)*0.15; }`;
      }
      if (m.type === "growth") {
        return `{ density += noise(q*${m.frequency}+${m.seed})*${m.amount}*0.6; }`;
      }
      return `{ density += (noise(q*${m.frequency}+${m.seed})-0.5)*${m.amount}*0.5; }`;
    })
    .join("\n");

  const opVex = operators
    .map((o) => {
      return `{ float ua=fit(@Time, chf("duration")*${o.start}, chf("duration")*min(1.0,${o.start}+${o.length}), 0, 1); ua=clamp(ua,0,1); ua=ua*ua*(3-2*ua); emission += ua*${o.temperatureDelta}*0.2*(1.0-radial); temperature += ua*${o.temperatureDelta}*(1.0-radial); vel += normalize(q+1e-4)*ua*${o.expansion}; density *= clamp(1.0-ua*${o.erosion}*shell*0.7, 0.15, 1); pressure += ua*${o.pressure}*(1.0-radial); }`;
    })
    .join("\n");

  const stateJson = JSON.stringify(
    {
      object: S.object,
      surface: S.surface,
      volume: S.volume,
      atmosphere: S.atmosphere,
      motion: S.motion,
      light: S.light,
      colors: S.colors,
      materialPath: S.materialPath,
      layers,
      sources,
      modifiers,
      operators,
      seed: S.meta.seed,
      name: S.meta.name,
    },
    null,
    2,
  );

  return `# -*- coding: utf-8 -*-
# SOLUM 4 — export determinístico
# Este script SOMENTE constrói a rede. Não executa render.
# Objeto: ${S.meta.name}
# Estrutura: ${S.layers.length} camadas / ${S.sources.length} fontes / ${modifiers.length} modificadores
# Frames: ${fr} @ ${S.motion.fps} fps${S.motion.loop ? " / loop" : ""}
# Campos: density temperature emission absorption scattering velocity pressure
# Cada fonte tem cor e cone próprios. Cada camada tem papel (casca/membrana/volume/cavidade/interior).

import hou, json

LOG = []
STATE = json.loads(${JSON.stringify(stateJson)})

OBJ = '/obj/solum_system'
MAT = ${JSON.stringify(S.materialPath)}


def parm(node, name, value):
    p = node.parm(name)
    if p is None:
        LOG.append(f'parametro ausente: {node.path()}.{name}')
        return
    try:
        p.set(value)
    except Exception as e:
        LOG.append(f'falhou {node.path()}.{name}: {e}')


def mk(g, typ, name, *ins):
    n = g.createNode(typ, name)
    for i, x in enumerate(ins):
        n.setInput(i, x)
    return n


def add_spare(node, items):
    pt = node.parmTemplateGroup()
    for key, label, default in items:
        pt.append(hou.FloatParmTemplate(key, label, 1, default_value=(default,)))
    node.setParmTemplateGroup(pt)


VEX = r'''
// SOLUM 4 fields: density temperature emission absorption scattering velocity pressure
float seed=chf("seed");
float sz=chf("scale");
float t=@Time;
float duration=max(chf("duration"), 0.001);
float phase=6.2831853*t/duration;
vector p=v@P;
vector q=p;
q += curlnoise(q*chf("macroFreq") + seed + phase*chf("flow")) * chf("warp") * 0.35;
float radial=length(q);
float n=noise(q*chf("macroNoise")+seed);
float dNoise=noise(q*chf("detailFreq")+seed*1.73);
float cavity=smooth(chf("cavity")*0.6, chf("cavity")*0.95, n);
float shell=exp(-pow(max(radial-0.65,0)/(chf("shellWidth")+0.0001),2));
float density=chf("density")*(0.25+0.75*shell)*(0.65+0.7*n)*clamp(1.0-cavity*chf("cavityDepth"),0,1);
density *= 1.0/(1.0+radial*radial*chf("radialFalloff")*3.0);
float filament=pow(1.0-abs(noise(q*chf("filamentScale")+seed*2.1)-0.5)*2.0, 4)*chf("filaments");
float mass=max(0, noise(q*chf("massScale")+seed*3.3)-0.55)*chf("masses");
density += filament*0.35 + mass*4.0;
float temperature=chf("temperature");
float emission=chf("emission")+filament*1.6;
float absorption=chf("absorption")+mass*0.4;
float scattering=chf("scattering");
float pressure=chf("pressure");
vector vel=curlnoise(q*1.7+seed)*chf("velocityScale");
// cores (cor por fonte vive no JSON STATE['sources'])
${coreVex}
// layer modulation
${layerVex}
// modifiers
${modVex}
// motion operators
${opVex}
float pulse=1.0+chf("pulse")*0.12*sin(phase);
vector expand=(radial>0.0001)?normalize(q)*chf("expansion")*sin(phase):set(0,0,0);
vel += expand;
@density=max(0, density*pulse);
@temperature=max(0, temperature);
@emission=max(0, emission);
@absorption=max(0, absorption);
@scattering=max(0, scattering);
@pressure=max(0, pressure);
v@v=vel*chf("speed");
'''

old = hou.node(OBJ)
if old:
    old.destroy()
g = hou.node('/obj').createNode('geo', 'solum_system')

box = mk(g, 'box', 'container')
parm(box, 'sizex', 4.0 * STATE['object']['scale'] * STATE['object']['scaleX'])
parm(box, 'sizey', 4.0 * STATE['object']['scale'] * STATE['object']['scaleY'])
parm(box, 'sizez', 4.0 * STATE['object']['scale'] * STATE['object']['scaleZ'])

base = mk(g, 'vdbfrompolygons', 'base_volume', box)
parm(base, 'voxelsize', 0.05)
parm(base, 'fogvolume', 1)
parm(base, 'fillinterior', 1)

fields = []
for name in ('temperature', 'emission', 'absorption', 'scattering', 'pressure'):
    w = mk(g, 'attribwrangle', 'field_' + name, base)
    try:
        parm(w, 'class', 'primitive')
    except Exception:
        pass
    parm(w, 'snippet', f's@name="{name}";')
    fields.append(w)

merge = mk(g, 'merge', 'fields', base, *fields)
wr = mk(g, 'volumewrangle', 'solum_fields', merge)
add_spare(wr, [
    ('seed', 'Seed', STATE['seed']),
    ('scale', 'Scale', STATE['object']['scale']),
    ('density', 'Density', STATE['volume']['density']),
    ('temperature', 'Temperature', STATE['volume']['temperatureGain']),
    ('emission', 'Emission', STATE['volume']['emissionGain']),
    ('absorption', 'Absorption', STATE['volume']['absorptionGain']),
    ('scattering', 'Scattering', STATE['volume']['scatteringGain']),
    ('pressure', 'Pressure', STATE['volume']['pressureGain']),
    ('radialFalloff', 'Radial falloff', STATE['volume']['radialFalloff']),
    ('shellWidth', 'Shell width', STATE['surface']['shellWidth']),
    ('macroNoise', 'Macro noise', STATE['surface']['macroNoise']),
    ('macroFreq', 'Macro frequency', STATE['surface']['macroFreq']),
    ('warp', 'Warp', STATE['surface']['irregularity']),
    ('detailFreq', 'Detail frequency', STATE['surface']['detailFreq']),
    ('cavity', 'Cavities', STATE['surface']['cavities']),
    ('cavityDepth', 'Cavity depth', STATE['surface']['cavityDepth']),
    ('filaments', 'Filaments', STATE['surface']['filaments']),
    ('filamentScale', 'Filament scale', STATE['surface']['filamentScale']),
    ('masses', 'Masses', STATE['surface']['masses']),
    ('massScale', 'Mass scale', STATE['surface']['massScale']),
    ('velocityScale', 'Velocity scale', STATE['volume']['velocityScale']),
    ('duration', 'Duration', STATE['motion']['duration']),
    ('flow', 'Flow', STATE['motion']['flow']),
    ('pulse', 'Pulse', STATE['motion']['pulse']),
    ('expansion', 'Expansion', STATE['motion']['expansion']),
    ('speed', 'Speed', STATE['motion']['speed']),
])
parm(wr, 'snippet', VEX)

out = mk(g, 'null', 'OUT', wr)
out.setDisplayFlag(True)
out.setRenderFlag(True)

dust = mk(g, 'attribwrangle', 'DUST_source')
add_spare(dust, [
    ('count', 'Count', STATE['atmosphere']['dust']),
    ('psize', 'Point size', STATE['atmosphere']['dustSize']),
    ('seed', 'Seed', STATE['seed']),
    ('radius', 'Radius', 1.5 * STATE['object']['scale']),
    ('fragments', 'Fragments', STATE['atmosphere']['fragments']),
])
parm(dust, 'class', 'detail')
parm(dust, 'snippet', '''int n=int(chf("count"));
float R=chf("radius");
for(int i=0;i<n;i++){
    vector d=normalize(set(rand(i,chf("seed"))-.5, rand(i,2)-.5, rand(i,3)-.5));
    int pt=addpoint(0, d*R*(.8+.9*pow(rand(i,4),1.5)));
    setpointattrib(0,"pscale",pt,chf("psize")*(.4+rand(i,5)));
}
int f=int(chf("fragments")*8000);
for(int i=0;i<f;i++){
    vector d=normalize(set(rand(i+91)-.5, rand(i+17)-.5, rand(i+4)-.5));
    int pt=addpoint(0, d*R*(1.05+rand(i,8)*0.4));
    setpointattrib(0,"pscale",pt,chf("psize")*(1.2+rand(i,9)));
}
''')
mk(g, 'null', 'DUST', dust)

g.layoutChildren()
hou.setFps(STATE['motion']['fps'])
hou.playbar.setFrameRange(1, ${fr})
hou.playbar.setPlaybackRange(1, ${fr})
hou.playbar.setPlayMode(hou.playMode.Loop if STATE['motion']['loop'] else hou.playMode.Once)

mat = hou.node(MAT)
if mat is None:
    LOG.append(f'material nao encontrado: {MAT}')
else:
    for name, color in (
        ('basecolor', STATE['colors']['background']),
        ('emitcolor', STATE['colors']['core']),
    ):
        p = mat.parm(name)
        if p is None:
            LOG.append(f'parm de material ausente: {name}')

print('SOLUM 4: /obj/solum_system criado.')
print('Campos: density temperature emission absorption scattering velocity pressure.')
print('Fontes: ${S.sources.length}  Camadas: ${S.layers.length}  Modificadores: ${modifiers.length}')
print('Papeis de camada:', ${JSON.stringify(S.layers.map((l) => l.name + "=" + l.role).join(" | "))})
for x in LOG:
    print(' -', x)
`;
}
