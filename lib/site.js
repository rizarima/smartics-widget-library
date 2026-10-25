export const SITE_NAME = 'SmartICS Widget Library';
export const WHATSAPP = '6287872689993'; // 087872689993
export const PER_PAGE = 50;
export const CATEGORIES = [
  { id: 'WTP', label: 'WTP', desc: 'Water treatment: tangki, pompa, valve, dosing' },
  { id: 'Power', label: 'Power', desc: 'Turbin, kompresor, heat exchanger, electrocell' },
  { id: 'Production', label: 'Production', desc: 'Reaktor, heat exchanger, mixing, proses' },
  { id: 'Piping', label: 'Piping', desc: 'Pipa, elbow, flange, reducer' },
  { id: 'Instrumentation', label: 'Instrumentation', desc: 'Meter, gauge, sensor, regulator' },
  { id: 'HVAC', label: 'HVAC', desc: 'Fan, blower, duct, chiller, cooling tower' },
  { id: 'Material Handling', label: 'Material Handling', desc: 'Conveyor, feeder, hopper, crane, forklift' },
  { id: 'Electrical', label: 'Electrical', desc: 'Motor, generator, panel listrik, switch, lampu' },
  { id: 'Oil & Gas', label: 'Oil & Gas', desc: 'Mud pump, pump jack, flare stack, refinery' },
  { id: 'Building', label: 'Building', desc: 'Gedung, pabrik, pintu, enclosure' },
  { id: 'IT & Network', label: 'IT & Network', desc: 'Komputer, server, jaringan, kamera' },
  { id: 'Safety & Icon', label: 'Safety & Icon', desc: 'Rambu keselamatan dan ikon umum' },
];
export const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
