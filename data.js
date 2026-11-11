/* ==========================================================================
   Thrive Automation FSM — demo dataset
   Generates a realistic, relative-to-today dataset so the app always looks live.
   ========================================================================== */
(function () {
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDay(n) { return new Date(today.getTime() + n * DAY); }
  function day(n) { return iso(addDay(n)); }
  function stamp(dayOffset, hour, minute) {
    var d = new Date(today.getTime() + dayOffset * DAY);
    d.setHours(hour || 9, minute || 0, 0, 0);
    return d.toISOString();
  }
  function minutesAgo(n) { return new Date(now.getTime() - n * 60000).toISOString(); }
  function weekStart(offsetWeeks) {
    var d = new Date(today);
    var dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow + (offsetWeeks || 0) * 7);
    return iso(d);
  }
  function plusDays(isoDate, n) {
    var p = isoDate.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  var thisWeek = weekStart(0);
  var lastWeek = weekStart(-1);

  /* ---------------------------------------------------------------- people */
  var technicians = [
    {
      id: 'T-01', name: 'Alex Morgan', initials: 'AM', role: 'Lead Field Engineer',
      group: 'North Metro', status: 'Available', utilization: 78, color: '#2563eb',
      phone: '(206) 555-0142', email: 'alex.morgan@thriveautomation.example',
      skills: ['HVAC', 'Electrical', 'Controls'], base: { lat: 47.6205, lng: -122.3493 }
    },
    {
      id: 'T-02', name: 'Priya Sharma', initials: 'PS', role: 'Field Engineer',
      group: 'North Metro', status: 'On Route', utilization: 92, color: '#0d9488',
      phone: '(206) 555-0187', email: 'priya.sharma@thriveautomation.example',
      skills: ['Elevator', 'Mechanical'], base: { lat: 47.6588, lng: -122.3130 }
    },
    {
      id: 'T-03', name: 'Jamal Carter', initials: 'JC', role: 'Field Engineer',
      group: 'West Region', status: 'Available', utilization: 64, color: '#7c3aed',
      phone: '(206) 555-0164', email: 'jamal.carter@thriveautomation.example',
      skills: ['Power', 'Security', 'Networking'], base: { lat: 47.5480, lng: -122.3750 }
    },
    {
      id: 'T-04', name: 'Sofia Reyes', initials: 'SR', role: 'Field Engineer',
      group: 'South Hub', status: 'Busy', utilization: 88, color: '#db2777',
      phone: '(206) 555-0129', email: 'sofia.reyes@thriveautomation.example',
      skills: ['Inspection', 'Safety', 'HVAC'], base: { lat: 47.4829, lng: -122.2171 }
    },
    {
      id: 'T-05', name: 'Daniel Kim', initials: 'DK', role: 'Senior Field Engineer',
      group: 'North Metro', status: 'Available', utilization: 71, color: '#d97706',
      phone: '(206) 555-0198', email: 'daniel.kim@thriveautomation.example',
      skills: ['HVAC', 'Power', 'Commissioning'], base: { lat: 47.7086, lng: -122.3250 }
    },
    {
      id: 'T-06', name: 'Morgan Blake', initials: 'MB', role: 'Field Engineer',
      group: 'East Division', status: 'On Leave', utilization: 0, color: '#64748b',
      phone: '(206) 555-0155', email: 'morgan.blake@thriveautomation.example',
      skills: ['Electrical', 'Safety'], base: { lat: 47.6101, lng: -122.2015 }
    }
  ];

  /* ----------------------------------------------------------------- sites */
  var sites = [
    {
      id: 'S-01', name: 'Harborview Medical Center', address: '325 9th Ave', city: 'Seattle',
      region: 'WA', zip: '98104', company: 'Harborview Health', contact: 'Dana Whitfield',
      phone: '(206) 555-0110', lat: 47.6045, lng: -122.3260, type: 'Healthcare', assetCount: 42
    },
    {
      id: 'S-02', name: 'Northgate Business Park', address: '401 NE Northgate Way', city: 'Seattle',
      region: 'WA', zip: '98125', company: 'Northgate Properties', contact: 'Luis Ortega',
      phone: '(206) 555-0133', lat: 47.7086, lng: -122.3250, type: 'Commercial', assetCount: 28
    },
    {
      id: 'S-03', name: 'Lakeside Residences', address: '1200 Lakeview Dr', city: 'Bellevue',
      region: 'WA', zip: '98005', company: 'Lakeside Living', contact: 'Priya Nair',
      phone: '(425) 555-0176', lat: 47.6101, lng: -122.2015, type: 'Residential', assetCount: 19
    },
    {
      id: 'S-04', name: 'Metro Rail Depot 4', address: '800 S Lander St', city: 'Seattle',
      region: 'WA', zip: '98134', company: 'Metro Transit Authority', contact: 'Ken Hoshino',
      phone: '(206) 555-0148', lat: 47.5795, lng: -122.3220, type: 'Transit', assetCount: 64
    },
    {
      id: 'S-05', name: 'Cedar Point Mall', address: '2500 Cedar Ave', city: 'Redmond',
      region: 'WA', zip: '98052', company: 'Cedar Retail Group', contact: 'Amara Osei',
      phone: '(425) 555-0192', lat: 47.6740, lng: -122.1215, type: 'Retail', assetCount: 51
    },
    {
      id: 'S-06', name: 'Summit Data Center', address: '900 Innovation Way', city: 'Tukwila',
      region: 'WA', zip: '98188', company: 'Summit Cloud', contact: 'Eric Vance',
      phone: '(206) 555-0107', lat: 47.4740, lng: -122.2600, type: 'Data Center', assetCount: 37
    },
    {
      id: 'S-07', name: 'Riverside Campus', address: '450 Riverside Pkwy', city: 'Renton',
      region: 'WA', zip: '98057', company: 'Riverside Education', contact: 'Nora Feldman',
      phone: '(425) 555-0121', lat: 47.4829, lng: -122.2171, type: 'Education', assetCount: 33
    },
    {
      id: 'S-08', name: 'Aurora Retail Plaza', address: '1500 Aurora Ave N', city: 'Seattle',
      region: 'WA', zip: '98109', company: 'Aurora Holdings', contact: 'Sam Delgado',
      phone: '(206) 555-0185', lat: 47.6330, lng: -122.3460, type: 'Retail', assetCount: 22
    }
  ];

  /* ---------------------------------------------------------------- assets */
  var assets = [
    { id: 'A-01', name: 'Rooftop HVAC Unit 3', type: 'HVAC', siteId: 'S-01', serial: 'HVAC-8842', status: 'Operational', lifecycle: 'In Service', installed: '2021-05-12', warranty: '2026-05-12' },
    { id: 'A-02', name: 'Elevator Car 2 Controller', type: 'Elevator', siteId: 'S-01', serial: 'ELEV-2291', status: 'Needs Attention', lifecycle: 'In Service', installed: '2019-11-03', warranty: '2024-11-03' },
    { id: 'A-03', name: 'Backup Generator 500kW', type: 'Power', siteId: 'S-04', serial: 'GEN-5012', status: 'Operational', lifecycle: 'In Service', installed: '2020-02-18', warranty: '2027-02-18' },
    { id: 'A-04', name: 'Access Control Panel', type: 'Security', siteId: 'S-04', serial: 'ACP-7720', status: 'Fault', lifecycle: 'In Service', installed: '2018-08-27', warranty: '2023-08-27' },
    { id: 'A-05', name: 'Water Pump P-12', type: 'Plumbing', siteId: 'S-03', serial: 'PUMP-3310', status: 'Operational', lifecycle: 'In Service', installed: '2022-04-09', warranty: '2025-04-09' },
    { id: 'A-06', name: 'UPS Battery Bank B', type: 'Power', siteId: 'S-06', serial: 'UPS-8844', status: 'Maintenance Due', lifecycle: 'In Service', installed: '2017-06-15', warranty: '2025-06-15' },
    { id: 'A-07', name: 'Cooling Tower CT-1', type: 'HVAC', siteId: 'S-06', serial: 'CT-1200', status: 'Operational', lifecycle: 'In Service', installed: '2020-09-30', warranty: '2026-09-30' },
    { id: 'A-08', name: 'Emergency Lighting Array', type: 'Electrical', siteId: 'S-05', serial: 'EML-4490', status: 'Operational', lifecycle: 'In Service', installed: '2023-01-20', warranty: '2028-01-20' },
    { id: 'A-09', name: 'Badge Reader West Wing', type: 'Security', siteId: 'S-02', serial: 'BR-1182', status: 'Fault', lifecycle: 'In Service', installed: '2021-10-11', warranty: '2026-10-11' },
    { id: 'A-10', name: 'Chiller CH-2', type: 'HVAC', siteId: 'S-05', serial: 'CHL-6621', status: 'Operational', lifecycle: 'In Service', installed: '2019-03-05', warranty: '2024-03-05' },
    { id: 'A-11', name: 'Fire Alarm Panel', type: 'Safety', siteId: 'S-07', serial: 'FAP-9012', status: 'Operational', lifecycle: 'In Service', installed: '2022-07-22', warranty: '2027-07-22' },
    { id: 'A-12', name: 'Solar Inverter Array', type: 'Energy', siteId: 'S-07', serial: 'SOL-3345', status: 'Maintenance Due', lifecycle: 'In Service', installed: '2021-12-01', warranty: '2026-12-01' }
  ];

  /* ------------------------------------------------------------- inventory */
  var warehouses = [
    { id: 'W-01', name: 'Central Warehouse', address: '2200 Industrial Blvd, Seattle, WA' },
    { id: 'W-02', name: 'North Depot', address: '900 NE 65th St, Seattle, WA' },
    { id: 'W-03', name: 'South Depot', address: '1400 Andover Park E, Tukwila, WA' }
  ];

  var inventory = [
    { id: 'I-01', sku: 'HVAC-FLT-13', name: 'HVAC Filter MERV 13', category: 'HVAC', warehouseId: 'W-01', bin: 'A-12', onHand: 8, reorderLevel: 20, unitCost: 24.5, unit: 'ea' },
    { id: 'I-02', sku: 'THERM-CTRL', name: 'Smart Thermostat Controller', category: 'HVAC', warehouseId: 'W-01', bin: 'B-04', onHand: 14, reorderLevel: 8, unitCost: 185, unit: 'ea' },
    { id: 'I-03', sku: 'ELEV-ROLL', name: 'Elevator Door Roller Kit', category: 'Elevator', warehouseId: 'W-02', bin: 'C-08', onHand: 22, reorderLevel: 10, unitCost: 64, unit: 'kit' },
    { id: 'I-04', sku: 'ACC-BOARD', name: 'Access Control Board', category: 'Security', warehouseId: 'W-01', bin: 'B-11', onHand: 3, reorderLevel: 5, unitCost: 420, unit: 'ea' },
    { id: 'I-05', sku: 'UPS-BAT', name: 'UPS Battery Module 12V', category: 'Power', warehouseId: 'W-03', bin: 'D-02', onHand: 5, reorderLevel: 12, unitCost: 310, unit: 'ea' },
    { id: 'I-06', sku: 'PUMP-SEAL', name: 'Water Pump Seal Kit', category: 'Plumbing', warehouseId: 'W-02', bin: 'C-03', onHand: 18, reorderLevel: 6, unitCost: 48, unit: 'kit' },
    { id: 'I-07', sku: 'LED-EM', name: 'LED Emergency Light', category: 'Electrical', warehouseId: 'W-01', bin: 'A-05', onHand: 36, reorderLevel: 15, unitCost: 32, unit: 'ea' },
    { id: 'I-08', sku: 'REF-R410A', name: 'Refrigerant R-410A (25 lb)', category: 'HVAC', warehouseId: 'W-01', bin: 'A-08', onHand: 4, reorderLevel: 6, unitCost: 210, unit: 'cyl' },
    { id: 'I-09', sku: 'BADGE-RDR', name: 'Badge Reader Prox 2', category: 'Security', warehouseId: 'W-02', bin: 'C-11', onHand: 9, reorderLevel: 4, unitCost: 265, unit: 'ea' },
    { id: 'I-10', sku: 'CT-BELT', name: 'Cooling Tower Drive Belt', category: 'HVAC', warehouseId: 'W-03', bin: 'D-06', onHand: 2, reorderLevel: 8, unitCost: 78, unit: 'ea' },
    { id: 'I-11', sku: 'FIRE-FUSE', name: 'Fire Panel Fuse Pack', category: 'Safety', warehouseId: 'W-03', bin: 'D-09', onHand: 26, reorderLevel: 10, unitCost: 18, unit: 'pk' },
    { id: 'I-12', sku: 'SOL-INV', name: 'Solar Inverter Fuse Set', category: 'Energy', warehouseId: 'W-02', bin: 'C-14', onHand: 12, reorderLevel: 5, unitCost: 95, unit: 'set' }
  ];

  var movements = [
    { id: 'IMO-2071', type: 'Receipt', itemId: 'I-02', qty: 10, fromWarehouseId: null, toWarehouseId: 'W-01', status: 'Completed', date: day(-1), requestedBy: 'Daniel Kim', note: 'PO-88421 — thermostat controllers' },
    { id: 'IMO-2072', type: 'Transfer', itemId: 'I-03', qty: 6, fromWarehouseId: 'W-01', toWarehouseId: 'W-02', status: 'In Transit', date: day(0), requestedBy: 'Priya Sharma', note: 'Replenish North Depot' },
    { id: 'IMO-2073', type: 'Issue', itemId: 'I-01', qty: 2, fromWarehouseId: 'W-01', toWarehouseId: null, status: 'Completed', date: day(-1), requestedBy: 'Alex Morgan', note: 'WO-1042 filter replacement' },
    { id: 'IMO-2074', type: 'Issue', itemId: 'I-08', qty: 1, fromWarehouseId: 'W-01', toWarehouseId: null, status: 'Draft', date: day(0), requestedBy: 'Daniel Kim', note: 'WO-1052 refrigerant top-up' },
    { id: 'IMO-2075', type: 'Receipt', itemId: 'I-07', qty: 24, fromWarehouseId: null, toWarehouseId: 'W-01', status: 'Completed', date: day(-2), requestedBy: 'Sofia Reyes', note: 'PO-88390 — emergency lighting' }
  ];

  /* --------------------------------------------------------------- projects */
  var projects = [
    {
      id: 'P-101', name: 'Harborview HVAC Retrofit', company: 'Harborview Health', status: 'Active',
      start: day(-45), end: day(60), budget: 185000, spent: 112400, hoursPlanned: 420, hoursLogged: 268,
      progress: 64, manager: 'Daniel Kim',
      description: 'Replace rooftop HVAC units and controls across the east wing, with a staged commissioning plan to keep clinical areas online.',
      milestones: [
        { id: 'M-1011', name: 'Site survey & scope', due: day(-30), status: 'Completed', progress: 100 },
        { id: 'M-1012', name: 'Equipment procurement', due: day(-10), status: 'Completed', progress: 100 },
        { id: 'M-1013', name: 'Rooftop unit installation', due: day(15), status: 'In Progress', progress: 70 },
        { id: 'M-1014', name: 'Commissioning & handover', due: day(55), status: 'Planned', progress: 0 }
      ]
    },
    {
      id: 'P-102', name: 'Metro Rail Access Modernization', company: 'Metro Transit Authority', status: 'Active',
      start: day(-60), end: day(30), budget: 240000, spent: 186000, hoursPlanned: 600, hoursLogged: 470,
      progress: 78, manager: 'Priya Sharma',
      description: 'Upgrade depot access control panels and badge readers across four secure zones while maintaining 24-hour operations.',
      milestones: [
        { id: 'M-1021', name: 'Security assessment', due: day(-45), status: 'Completed', progress: 100 },
        { id: 'M-1022', name: 'Panel replacements (zones 1-2)', due: day(-15), status: 'Completed', progress: 100 },
        { id: 'M-1023', name: 'Reader rollout (zones 3-4)', due: day(8), status: 'In Progress', progress: 45 },
        { id: 'M-1024', name: 'Final audit & training', due: day(26), status: 'Planned', progress: 0 }
      ]
    },
    {
      id: 'P-103', name: 'Cedar Point Energy Audit', company: 'Cedar Retail Group', status: 'On Hold',
      start: day(-20), end: day(40), budget: 68000, spent: 21400, hoursPlanned: 160, hoursLogged: 92,
      progress: 35, manager: 'Sofia Reyes',
      description: 'Full-building energy audit covering lighting, chillers and controls. On hold pending tenant access approvals.',
      milestones: [
        { id: 'M-1031', name: 'Metering & data capture', due: day(-8), status: 'Completed', progress: 100 },
        { id: 'M-1032', name: 'Lighting survey', due: day(5), status: 'In Progress', progress: 20 },
        { id: 'M-1033', name: 'Chiller efficiency review', due: day(18), status: 'Planned', progress: 0 },
        { id: 'M-1034', name: 'Recommendations report', due: day(35), status: 'Planned', progress: 0 }
      ]
    },
    {
      id: 'P-104', name: 'Riverside Solar Rollout', company: 'Riverside Education', status: 'Planning',
      start: day(10), end: day(120), budget: 410000, spent: 0, hoursPlanned: 800, hoursLogged: 0,
      progress: 8, manager: 'Jamal Carter',
      description: 'Design and install a 380 kW rooftop solar array across three campus buildings, including inverter and monitoring infrastructure.',
      milestones: [
        { id: 'M-1041', name: 'Structural feasibility', due: day(14), status: 'In Progress', progress: 15 },
        { id: 'M-1042', name: 'Permits & interconnection', due: day(38), status: 'Planned', progress: 0 },
        { id: 'M-1043', name: 'Array installation', due: day(88), status: 'Planned', progress: 0 },
        { id: 'M-1044', name: 'Grid connection & monitoring', due: day(115), status: 'Planned', progress: 0 }
      ]
    }
  ];

  /* ------------------------------------------------------------- templates */
  var workOrderTemplates = [
    { id: 'WT-01', name: 'HVAC Quarterly Service', category: 'HVAC', duration: 2.5, description: 'Preventive maintenance for packaged rooftop units.', tasks: ['Inspect and replace filters', 'Clean condenser and evaporator coils', 'Check refrigerant charge', 'Test thermostat and controls', 'Record readings and sign off'] },
    { id: 'WT-02', name: 'Elevator Repair', category: 'Elevator', duration: 3, description: 'Corrective repair workflow for elevator faults.', tasks: ['Isolate power and apply lockout tagout', 'Diagnose reported fault', 'Replace failed components', 'Test operation through full cycle', 'Update maintenance log'] },
    { id: 'WT-03', name: 'Access Control Install', category: 'Security', duration: 4, description: 'Install and commission an access control panel.', tasks: ['Mount panel and raceway', 'Terminate field wiring', 'Configure reader access levels', 'Test door strike and egress', 'Update as-built documentation'] },
    { id: 'WT-04', name: 'Generator Preventive', category: 'Power', duration: 2, description: 'Monthly generator inspection and load test.', tasks: ['Check oil and coolant levels', 'Inspect belts and hoses', 'Run 30-minute load test', 'Record output values', 'Clear alarms and log results'] },
    { id: 'WT-05', name: 'Safety Walkthrough', category: 'Safety', duration: 1.5, description: 'Routine site safety and compliance walkthrough.', tasks: ['Check egress routes and exits', 'Test emergency alarms', 'Inspect extinguishers', 'Review signage and lighting', 'Document findings'] }
  ];

  var checklistTemplates = [
    {
      id: 'CT-01', name: 'HVAC Quarterly Service', region: 'North', description: 'Standard preventive checklist for rooftop HVAC units.',
      items: ['Confirm unit identity and service tag', 'Lock out / tag out unit power', 'Replace return-air filters', 'Clean condenser coil', 'Check refrigerant pressures', 'Test thermostat and economizer', 'Record supply/return temperatures', 'Photograph unit and log readings']
    },
    {
      id: 'CT-02', name: 'Elevator Safety Inspection', region: 'All', description: 'Regulatory inspection checklist for passenger elevators.',
      items: ['Check machine-room condition', 'Test door obstruction sensor', 'Verify emergency phone', 'Inspect ropes and sheaves', 'Test alarm and lighting', 'Confirm inspection certificate posted']
    },
    {
      id: 'CT-03', name: 'Site Safety Walkthrough', region: 'All', description: 'General site safety and compliance walkthrough.',
      items: ['Walk all egress routes', 'Verify exit signage lit', 'Inspect fire extinguishers', 'Test emergency lighting', 'Check first-aid kit stock', 'Confirm hazard signage', 'Photograph deficiencies', 'File findings with site contact']
    },
    {
      id: 'CT-04', name: 'Data Center Cooling Audit', region: 'West', description: 'Cooling system audit for critical facilities.',
      items: ['Check CRAC unit setpoints', 'Verify redundant cooling path', 'Inspect cooling tower basin', 'Record supply air temperatures', 'Review alarm history', 'Test failover sequence', 'Document capacity headroom']
    }
  ];

  var checklists = [
    {
      id: 'CHK-301', name: 'Fire safety walkthrough', templateId: 'CT-03', siteId: 'S-01', woId: null,
      assigneeId: 'T-01', due: day(0), status: 'In Progress',
      items: [
        { label: 'Walk all egress routes', done: true }, { label: 'Verify exit signage lit', done: true },
        { label: 'Inspect fire extinguishers', done: true }, { label: 'Test emergency lighting', done: true },
        { label: 'Check first-aid kit stock', done: true }, { label: 'Confirm hazard signage', done: false },
        { label: 'Photograph deficiencies', done: false }, { label: 'File findings with site contact', done: false }
      ]
    },
    {
      id: 'CHK-302', name: 'HVAC quarterly service — RTU 3', templateId: 'CT-01', siteId: 'S-01', woId: 'WO-1042',
      assigneeId: 'T-01', due: day(1), status: 'In Progress',
      items: [
        { label: 'Confirm unit identity and service tag', done: true }, { label: 'Lock out / tag out unit power', done: true },
        { label: 'Replace return-air filters', done: true }, { label: 'Clean condenser coil', done: true },
        { label: 'Check refrigerant pressures', done: false }, { label: 'Test thermostat and economizer', done: false },
        { label: 'Record supply/return temperatures', done: false }, { label: 'Photograph unit and log readings', done: false }
      ]
    },
    {
      id: 'CHK-303', name: 'Elevator safety inspection — Car 2', templateId: 'CT-02', siteId: 'S-01', woId: 'WO-1043',
      assigneeId: 'T-02', due: day(2), status: 'Not Started',
      items: [
        { label: 'Check machine-room condition', done: false }, { label: 'Test door obstruction sensor', done: false },
        { label: 'Verify emergency phone', done: false }, { label: 'Inspect ropes and sheaves', done: false },
        { label: 'Test alarm and lighting', done: false }, { label: 'Confirm inspection certificate posted', done: false }
      ]
    },
    {
      id: 'CHK-304', name: 'Data center cooling audit', templateId: 'CT-04', siteId: 'S-06', woId: null,
      assigneeId: 'T-03', due: day(4), status: 'In Progress',
      items: [
        { label: 'Check CRAC unit setpoints', done: true }, { label: 'Verify redundant cooling path', done: true },
        { label: 'Inspect cooling tower basin', done: true }, { label: 'Record supply air temperatures', done: false },
        { label: 'Review alarm history', done: false }, { label: 'Test failover sequence', done: false },
        { label: 'Document capacity headroom', done: false }
      ]
    },
    {
      id: 'CHK-305', name: 'Retail emergency lighting', templateId: 'CT-03', siteId: 'S-05', woId: 'WO-1051',
      assigneeId: 'T-04', due: day(-1), status: 'Completed',
      items: [
        { label: 'Walk all egress routes', done: true }, { label: 'Verify exit signage lit', done: true },
        { label: 'Inspect fire extinguishers', done: true }, { label: 'Test emergency lighting', done: true },
        { label: 'Check first-aid kit stock', done: true }, { label: 'Confirm hazard signage', done: true },
        { label: 'Photograph deficiencies', done: true }, { label: 'File findings with site contact', done: true }
      ]
    }
  ];

  /* ------------------------------------------------------------- work orders */
  var workOrders = [
    {
      id: 'WO-1042', title: 'Quarterly HVAC maintenance — RTU 3', siteId: 'S-01', company: 'Harborview Health',
      type: 'Preventive', priority: 'Medium', status: 'In Progress', techId: 'T-01',
      created: day(-6), due: day(1), scheduled: stamp(0, 9, 0), estimate: 2.5, actual: 1.2,
      templateId: 'WT-01', template: 'HVAC Quarterly Service', category: 'HVAC', billable: true,
      description: 'Complete quarterly preventive service on rooftop unit 3. Filters were staged during last visit; verify refrigerant charge and economizer operation before sign-off.',
      tasks: [
        { id: 'TK-1', label: 'Inspect and replace filters', done: true },
        { id: 'TK-2', label: 'Clean condenser and evaporator coils', done: true },
        { id: 'TK-3', label: 'Check refrigerant charge', done: false },
        { id: 'TK-4', label: 'Test thermostat and controls', done: false },
        { id: 'TK-5', label: 'Record readings and sign off', done: false }
      ],
      parts: [{ itemId: 'I-01', qty: 2 }],
      history: [
        { at: stamp(-6, 14, 30), by: 'Dana Whitfield', text: 'Work order created from preventive maintenance plan.' },
        { at: stamp(-5, 8, 15), by: 'Daniel Kim', text: 'Assigned to Alex Morgan.' },
        { at: stamp(0, 9, 4), by: 'Alex Morgan', text: 'Status changed to In Progress. Arrived on site.' }
      ]
    },
    {
      id: 'WO-1043', title: 'Elevator car 2 door fault', siteId: 'S-01', company: 'Harborview Health',
      type: 'Corrective', priority: 'Critical', status: 'In Progress', techId: 'T-02',
      created: day(-1), due: day(0), scheduled: stamp(0, 10, 30), estimate: 3, actual: 1.5,
      templateId: 'WT-02', template: 'Elevator Repair', category: 'Elevator', billable: true,
      description: 'Car 2 doors reopen intermittently at floor 4. Facility reports two near-miss incidents. Isolate car and inspect door roller and obstruction sensor.',
      tasks: [
        { id: 'TK-1', label: 'Isolate power and apply lockout tagout', done: true },
        { id: 'TK-2', label: 'Diagnose reported fault', done: true },
        { id: 'TK-3', label: 'Replace failed components', done: false },
        { id: 'TK-4', label: 'Test operation through full cycle', done: false },
        { id: 'TK-5', label: 'Update maintenance log', done: false }
      ],
      parts: [{ itemId: 'I-03', qty: 1 }],
      history: [
        { at: stamp(-1, 7, 45), by: 'Dana Whitfield', text: 'Critical work order created after facility report.' },
        { at: stamp(-1, 8, 10), by: 'Daniel Kim', text: 'Assigned to Priya Sharma.' },
        { at: stamp(0, 10, 42), by: 'Priya Sharma', text: 'Status changed to In Progress. Door roller wear confirmed.' }
      ]
    },
    {
      id: 'WO-1044', title: 'Replace failed access controller', siteId: 'S-04', company: 'Metro Transit Authority',
      type: 'Corrective', priority: 'High', status: 'Assigned', techId: 'T-03',
      created: day(-2), due: day(2), scheduled: stamp(0, 13, 0), estimate: 4, actual: 0,
      templateId: 'WT-03', template: 'Access Control Install', category: 'Security', billable: true,
      description: 'Zone 3 controller is offline after a power surge. Replacement board is in Central Warehouse (bin B-11). Coordinate with depot security for escorted access.',
      tasks: [
        { id: 'TK-1', label: 'Mount panel and raceway', done: false },
        { id: 'TK-2', label: 'Terminate field wiring', done: false },
        { id: 'TK-3', label: 'Configure reader access levels', done: false },
        { id: 'TK-4', label: 'Test door strike and egress', done: false },
        { id: 'TK-5', label: 'Update as-built documentation', done: false }
      ],
      parts: [{ itemId: 'I-04', qty: 1 }],
      history: [
        { at: stamp(-2, 16, 5), by: 'Ken Hoshino', text: 'Work order created. Zone 3 offline.' },
        { at: stamp(-2, 16, 20), by: 'Daniel Kim', text: 'Assigned to Jamal Carter for Thursday.' }
      ]
    },
    {
      id: 'WO-1045', title: 'Backup generator load test', siteId: 'S-04', company: 'Metro Transit Authority',
      type: 'Preventive', priority: 'Medium', status: 'Assigned', techId: 'T-05',
      created: day(-4), due: day(3), scheduled: stamp(0, 8, 0), estimate: 2, actual: 0,
      templateId: 'WT-04', template: 'Generator Preventive', category: 'Power', billable: true,
      description: 'Monthly load test on the 500 kW backup generator. Depot operations require 48-hour notice; confirmation received.',
      tasks: [
        { id: 'TK-1', label: 'Check oil and coolant levels', done: false },
        { id: 'TK-2', label: 'Inspect belts and hoses', done: false },
        { id: 'TK-3', label: 'Run 30-minute load test', done: false },
        { id: 'TK-4', label: 'Record output values', done: false },
        { id: 'TK-5', label: 'Clear alarms and log results', done: false }
      ],
      parts: [],
      history: [
        { at: stamp(-4, 9, 0), by: 'System', text: 'Scheduled preventive work order generated.' },
        { at: stamp(-3, 11, 30), by: 'Daniel Kim', text: 'Assigned to Daniel Kim.' }
      ]
    },
    {
      id: 'WO-1046', title: 'Chiller CH-2 inspection', siteId: 'S-05', company: 'Cedar Retail Group',
      type: 'Preventive', priority: 'Medium', status: 'New', techId: null,
      created: day(-1), due: day(4), scheduled: stamp(1, 9, 0), estimate: 2.5, actual: 0,
      templateId: null, template: 'HVAC Quarterly Service', category: 'HVAC', billable: true,
      description: 'Semi-annual chiller inspection. Tenant access window is 9:00–12:00. Confirm mall management escort on arrival.',
      tasks: [
        { id: 'TK-1', label: 'Verify chiller operating parameters', done: false },
        { id: 'TK-2', label: 'Inspect condenser water flow', done: false },
        { id: 'TK-3', label: 'Check refrigerant levels', done: false },
        { id: 'TK-4', label: 'Log readings and recommendations', done: false }
      ],
      parts: [],
      history: [{ at: stamp(-1, 15, 45), by: 'Amara Osei', text: 'Work order created via service request.' }]
    },
    {
      id: 'WO-1047', title: 'Badge reader replacement — West Wing', siteId: 'S-02', company: 'Northgate Properties',
      type: 'Corrective', priority: 'High', status: 'New', techId: null,
      created: day(0), due: day(1), scheduled: null, estimate: 1.5, actual: 0,
      templateId: 'WT-03', template: 'Access Control Install', category: 'Security', billable: true,
      description: 'West Wing reader no longer reads prox cards. Replacement reader in North Depot. Security desk will issue temporary access during the swap.',
      tasks: [
        { id: 'TK-1', label: 'Confirm reader firmware compatibility', done: false },
        { id: 'TK-2', label: 'Remove failed reader', done: false },
        { id: 'TK-3', label: 'Install replacement and configure', done: false },
        { id: 'TK-4', label: 'Test cards and audit log', done: false }
      ],
      parts: [{ itemId: 'I-09', qty: 1 }],
      history: [{ at: stamp(0, 8, 20), by: 'Luis Ortega', text: 'Work order created. West Wing reader offline.' }]
    },
    {
      id: 'WO-1048', title: 'Cooling tower belt replacement', siteId: 'S-06', company: 'Summit Cloud',
      type: 'Corrective', priority: 'Critical', status: 'On Hold', techId: 'T-02',
      created: day(-3), due: day(1), scheduled: stamp(0, 15, 30), estimate: 2, actual: 0.5,
      templateId: null, template: 'Corrective Repair', category: 'HVAC', billable: true,
      description: 'Belt on cooling tower CT-1 is frayed. Replacement belt is below reorder point; expedited order placed. Tower running on redundant unit.',
      tasks: [
        { id: 'TK-1', label: 'Confirm redundant tower is online', done: true },
        { id: 'TK-2', label: 'Receive replacement belt', done: false },
        { id: 'TK-3', label: 'Replace belt and tension', done: false },
        { id: 'TK-4', label: 'Run tower and verify vibration', done: false }
      ],
      parts: [{ itemId: 'I-10', qty: 2 }],
      holdReason: 'Awaiting replacement belt (expedited delivery)',
      history: [
        { at: stamp(-3, 11, 0), by: 'Eric Vance', text: 'Critical work order created.' },
        { at: stamp(-2, 9, 30), by: 'Priya Sharma', text: 'Status changed to On Hold — parts on order.' }
      ]
    },
    {
      id: 'WO-1049', title: 'UPS battery bank replacement', siteId: 'S-06', company: 'Summit Cloud',
      type: 'Preventive', priority: 'High', status: 'Assigned', techId: 'T-03',
      created: day(-5), due: day(5), scheduled: stamp(2, 9, 0), estimate: 6, actual: 0,
      templateId: null, template: 'Power Preventive', category: 'Power', billable: true,
      description: 'Replace all four battery modules in UPS bank B. Maintenance window approved for Saturday 06:00–14:00. Two-person crew recommended.',
      tasks: [
        { id: 'TK-1', label: 'Confirm maintenance bypass', done: false },
        { id: 'TK-2', label: 'Replace battery modules', done: false },
        { id: 'TK-3', label: 'Run self-test and calibration', done: false },
        { id: 'TK-4', label: 'Dispose of old batteries per policy', done: false }
      ],
      parts: [{ itemId: 'I-05', qty: 4 }],
      history: [
        { at: stamp(-5, 10, 0), by: 'Eric Vance', text: 'Work order created for battery bank B.' },
        { at: stamp(-4, 13, 20), by: 'Daniel Kim', text: 'Assigned to Jamal Carter.' }
      ]
    },
    {
      id: 'WO-1050', title: 'Leak repair — pump room P-12', siteId: 'S-03', company: 'Lakeside Living',
      type: 'Corrective', priority: 'Medium', status: 'Completed', techId: 'T-01',
      created: day(-7), due: day(-1), scheduled: stamp(-1, 9, 0), estimate: 3, actual: 3.5,
      completedAt: day(-1), templateId: null, template: 'Corrective Repair', category: 'Plumbing', billable: true,
      description: 'Seal kit replacement on recirculation pump P-12. Leak confirmed at mechanical seal; area dried and tested.',
      tasks: [
        { id: 'TK-1', label: 'Isolate pump and drain', done: true },
        { id: 'TK-2', label: 'Replace mechanical seal kit', done: true },
        { id: 'TK-3', label: 'Refill and pressure test', done: true },
        { id: 'TK-4', label: 'Clean work area and document', done: true }
      ],
      parts: [{ itemId: 'I-06', qty: 1 }],
      history: [
        { at: stamp(-7, 8, 15), by: 'Priya Nair', text: 'Leak reported in pump room.' },
        { at: stamp(-1, 12, 40), by: 'Alex Morgan', text: 'Repair complete. Pressure held at 60 psi.' },
        { at: stamp(-1, 12, 45), by: 'Alex Morgan', text: 'Status changed to Completed.' }
      ]
    },
    {
      id: 'WO-1051', title: 'Emergency lighting compliance test', siteId: 'S-05', company: 'Cedar Retail Group',
      type: 'Inspection', priority: 'Low', status: 'Completed', techId: 'T-04',
      created: day(-8), due: day(-2), scheduled: stamp(-2, 10, 0), estimate: 2, actual: 1.75,
      completedAt: day(-2), templateId: null, template: 'Safety Walkthrough', category: 'Safety', billable: false,
      description: 'Annual emergency lighting test across common areas. All fixtures passed; two batteries replaced.',
      tasks: [
        { id: 'TK-1', label: 'Walk all egress routes', done: true },
        { id: 'TK-2', label: 'Test 90-minute battery duration', done: true },
        { id: 'TK-3', label: 'Replace failed batteries', done: true },
        { id: 'TK-4', label: 'Log results for compliance', done: true }
      ],
      parts: [{ itemId: 'I-07', qty: 2 }],
      history: [
        { at: stamp(-8, 9, 0), by: 'System', text: 'Annual inspection generated.' },
        { at: stamp(-2, 12, 10), by: 'Sofia Reyes', text: 'Status changed to Completed. Compliance log filed.' }
      ]
    },
    {
      id: 'WO-1052', title: 'Refrigerant top-up — rooftop unit 3', siteId: 'S-01', company: 'Harborview Health',
      type: 'Corrective', priority: 'High', status: 'In Progress', techId: 'T-05',
      created: day(-1), due: day(0), scheduled: stamp(0, 11, 30), estimate: 1.5, actual: 0.75,
      templateId: null, template: 'Corrective Repair', category: 'HVAC', billable: true,
      description: 'Low suction pressure reported during routine rounds. Leak check completed; add R-410A and monitor pressures.',
      tasks: [
        { id: 'TK-1', label: 'Leak check system', done: true },
        { id: 'TK-2', label: 'Add refrigerant to spec', done: false },
        { id: 'TK-3', label: 'Verify subcooling and superheat', done: false },
        { id: 'TK-4', label: 'Record final readings', done: false }
      ],
      parts: [{ itemId: 'I-08', qty: 1 }],
      history: [
        { at: stamp(-1, 15, 0), by: 'Alex Morgan', text: 'Low pressure observed during PM visit.' },
        { at: stamp(0, 11, 35), by: 'Daniel Kim', text: 'Status changed to In Progress.' }
      ]
    },
    {
      id: 'WO-1053', title: 'Quarter-end fire panel inspection', siteId: 'S-07', company: 'Riverside Education',
      type: 'Inspection', priority: 'Medium', status: 'Assigned', techId: 'T-04',
      created: day(-2), due: day(6), scheduled: stamp(1, 13, 30), estimate: 2.5, actual: 0,
      templateId: 'WT-05', template: 'Safety Walkthrough', category: 'Safety', billable: false,
      description: 'Quarter-end inspection of fire alarm panel and field devices. Coordinate with campus facilities; quiet hours 12:00–13:00.',
      tasks: [
        { id: 'TK-1', label: 'Review panel event log', done: false },
        { id: 'TK-2', label: 'Test initiating devices', done: false },
        { id: 'TK-3', label: 'Verify notification appliances', done: false },
        { id: 'TK-4', label: 'Sign compliance record', done: false }
      ],
      parts: [],
      history: [
        { at: stamp(-2, 10, 0), by: 'Nora Feldman', text: 'Inspection requested.' },
        { at: stamp(-1, 9, 15), by: 'Daniel Kim', text: 'Assigned to Sofia Reyes.' }
      ]
    },
    {
      id: 'WO-1054', title: 'Solar inverter fuse replacement', siteId: 'S-07', company: 'Riverside Education',
      type: 'Corrective', priority: 'Low', status: 'New', techId: null,
      created: day(-1), due: day(5), scheduled: null, estimate: 1, actual: 0,
      templateId: null, template: 'Corrective Repair', category: 'Energy', billable: true,
      description: 'Inverter string 4 reporting zero output. Fuse set in North Depot. Verify string isolation before replacement.',
      tasks: [
        { id: 'TK-1', label: 'Isolate affected string', done: false },
        { id: 'TK-2', label: 'Replace fuse set', done: false },
        { id: 'TK-3', label: 'Verify string output', done: false }
      ],
      parts: [{ itemId: 'I-12', qty: 1 }],
      history: [{ at: stamp(-1, 16, 30), by: 'Monitoring', text: 'String 4 output loss detected.' }]
    },
    {
      id: 'WO-1055', title: 'Door closer adjustment — main lobby', siteId: 'S-02', company: 'Northgate Properties',
      type: 'Corrective', priority: 'Low', status: 'Completed', techId: 'T-03',
      created: day(-6), due: day(-3), scheduled: stamp(-3, 14, 0), estimate: 1, actual: 0.75,
      completedAt: day(-2), templateId: null, template: 'Corrective Repair', category: 'General', billable: false,
      description: 'Main lobby door closer slamming. Adjusted closing speed and latch speed; verified accessibility timing.',
      tasks: [
        { id: 'TK-1', label: 'Adjust closing speed', done: true },
        { id: 'TK-2', label: 'Adjust latch speed', done: true },
        { id: 'TK-3', label: 'Verify accessibility timing', done: true }
      ],
      parts: [],
      history: [
        { at: stamp(-6, 12, 0), by: 'Luis Ortega', text: 'Door closer reported slamming.' },
        { at: stamp(-2, 9, 20), by: 'Jamal Carter', text: 'Status changed to Completed.' }
      ]
    },
    {
      id: 'WO-1056', title: 'Rooftop unit filter change — Plaza North', siteId: 'S-08', company: 'Aurora Holdings',
      type: 'Preventive', priority: 'Medium', status: 'On Hold', techId: 'T-05',
      created: day(-4), due: day(2), scheduled: stamp(0, 16, 0), estimate: 1.5, actual: 0,
      templateId: 'WT-01', template: 'HVAC Quarterly Service', category: 'HVAC', billable: true,
      description: 'Filter change delayed: roof access hatch lock is broken and building engineer is unavailable until Friday.',
      tasks: [
        { id: 'TK-1', label: 'Confirm roof access', done: false },
        { id: 'TK-2', label: 'Replace filters', done: false },
        { id: 'TK-3', label: 'Clean intake screen', done: false },
        { id: 'TK-4', label: 'Log readings', done: false }
      ],
      parts: [{ itemId: 'I-01', qty: 2 }],
      holdReason: 'Roof access unavailable until Friday',
      history: [
        { at: stamp(-4, 9, 0), by: 'System', text: 'Preventive work order generated.' },
        { at: stamp(0, 8, 30), by: 'Daniel Kim', text: 'Status changed to On Hold — access issue.' }
      ]
    },
    {
      id: 'WO-1057', title: 'Monthly safety walkthrough', siteId: 'S-03', company: 'Lakeside Living',
      type: 'Inspection', priority: 'Low', status: 'Assigned', techId: 'T-04',
      created: day(-1), due: day(7), scheduled: stamp(1, 8, 30), estimate: 1.5, actual: 0,
      templateId: 'WT-05', template: 'Safety Walkthrough', category: 'Safety', billable: false,
      description: 'Monthly safety walkthrough of residential common areas and service corridors.',
      tasks: [
        { id: 'TK-1', label: 'Check egress routes and exits', done: false },
        { id: 'TK-2', label: 'Test emergency alarms', done: false },
        { id: 'TK-3', label: 'Inspect extinguishers', done: false },
        { id: 'TK-4', label: 'Review signage and lighting', done: false },
        { id: 'TK-5', label: 'Document findings', done: false }
      ],
      parts: [],
      history: [
        { at: stamp(-1, 11, 0), by: 'Priya Nair', text: 'Monthly walkthrough requested.' },
        { at: stamp(-1, 11, 15), by: 'Daniel Kim', text: 'Assigned to Sofia Reyes.' }
      ]
    },
    {
      id: 'WO-1058', title: 'Quarterly HVAC maintenance — RTU 1', siteId: 'S-01', company: 'Harborview Health',
      type: 'Preventive', priority: 'Medium', status: 'Completed', techId: 'T-01',
      created: day(-8), due: day(-4), scheduled: stamp(-4, 9, 0), estimate: 2.5, actual: 2.25,
      completedAt: day(-4), templateId: 'WT-01', template: 'HVAC Quarterly Service', category: 'HVAC', billable: true,
      description: 'Quarterly service on rooftop unit 1. Filters replaced, coils cleaned, readings within range.',
      tasks: [
        { id: 'TK-1', label: 'Inspect and replace filters', done: true },
        { id: 'TK-2', label: 'Clean condenser and evaporator coils', done: true },
        { id: 'TK-3', label: 'Check refrigerant charge', done: true },
        { id: 'TK-4', label: 'Test thermostat and controls', done: true },
        { id: 'TK-5', label: 'Record readings and sign off', done: true }
      ],
      parts: [{ itemId: 'I-01', qty: 2 }],
      history: [
        { at: stamp(-8, 9, 0), by: 'System', text: 'Preventive work order generated.' },
        { at: stamp(-4, 11, 30), by: 'Alex Morgan', text: 'Service complete and readings logged.' },
        { at: stamp(-4, 11, 35), by: 'Alex Morgan', text: 'Status changed to Completed.' }
      ]
    },
    {
      id: 'WO-1059', title: 'Emergency exit sign repair', siteId: 'S-08', company: 'Aurora Holdings',
      type: 'Corrective', priority: 'Medium', status: 'Completed', techId: 'T-03',
      created: day(-7), due: day(-5), scheduled: stamp(-5, 13, 0), estimate: 1.5, actual: 1,
      completedAt: day(-5), templateId: null, template: 'Corrective Repair', category: 'Electrical', billable: true,
      description: 'Exit sign at level 2 stairwell was flickering. Driver replaced and sign tested.',
      tasks: [
        { id: 'TK-1', label: 'Isolate circuit', done: true },
        { id: 'TK-2', label: 'Replace sign driver', done: true },
        { id: 'TK-3', label: 'Test on battery backup', done: true }
      ],
      parts: [{ itemId: 'I-07', qty: 1 }],
      history: [
        { at: stamp(-7, 10, 0), by: 'Sam Delgado', text: 'Exit sign reported flickering.' },
        { at: stamp(-5, 14, 10), by: 'Jamal Carter', text: 'Status changed to Completed.' }
      ]
    },
    {
      id: 'WO-1060', title: 'Chiller filter service', siteId: 'S-05', company: 'Cedar Retail Group',
      type: 'Preventive', priority: 'Low', status: 'Completed', techId: 'T-04',
      created: day(-9), due: day(-6), scheduled: stamp(-6, 10, 0), estimate: 1, actual: 0.75,
      completedAt: day(-6), templateId: null, template: 'HVAC Quarterly Service', category: 'HVAC', billable: true,
      description: 'Filter service on chiller CH-2. Filters cleaned and airflow verified.',
      tasks: [
        { id: 'TK-1', label: 'Clean intake filters', done: true },
        { id: 'TK-2', label: 'Verify airflow', done: true },
        { id: 'TK-3', label: 'Log readings', done: true }
      ],
      parts: [],
      history: [
        { at: stamp(-9, 9, 0), by: 'System', text: 'Preventive work order generated.' },
        { at: stamp(-6, 11, 0), by: 'Sofia Reyes', text: 'Status changed to Completed.' }
      ]
    }
  ];

  /* -------------------------------------------------------------- timesheets */
  var timesheets = [
    {
      id: 'TS-501', techId: 'T-01', weekStart: thisWeek, status: 'Draft', submittedAt: null, approvedBy: null,
      entries: [
        { id: 'TE-1', date: thisWeek, woId: 'WO-1050', projectId: null, type: 'Regular', hours: 3.5, billable: true, note: 'Pump seal repair and pressure test.' },
        { id: 'TE-2', date: plusDays(thisWeek, 1), woId: 'WO-1042', projectId: null, type: 'Regular', hours: 4, billable: true, note: 'HVAC quarterly service — RTU 3.' },
        { id: 'TE-3', date: plusDays(thisWeek, 2), woId: 'WO-1052', projectId: null, type: 'Regular', hours: 2.5, billable: true, note: 'Refrigerant top-up and readings.' },
        { id: 'TE-4', date: plusDays(thisWeek, 3), woId: null, projectId: 'P-101', type: 'Regular', hours: 3, billable: true, note: 'Project coordination and site walk.' }
      ]
    },
    {
      id: 'TS-502', techId: 'T-02', weekStart: thisWeek, status: 'Submitted', submittedAt: minutesAgo(135), approvedBy: null,
      entries: [
        { id: 'TE-1', date: thisWeek, woId: 'WO-1043', projectId: null, type: 'Regular', hours: 3, billable: true, note: 'Elevator diagnostic and door roller repair.' },
        { id: 'TE-2', date: plusDays(thisWeek, 1), woId: 'WO-1048', projectId: null, type: 'Regular', hours: 4, billable: true, note: 'Cooling tower inspection; parts on order.' },
        { id: 'TE-3', date: plusDays(thisWeek, 2), woId: 'WO-1043', projectId: null, type: 'Regular', hours: 3.5, billable: true, note: 'Elevator testing and handover.' },
        { id: 'TE-4', date: plusDays(thisWeek, 3), woId: null, projectId: 'P-102', type: 'Regular', hours: 2, billable: true, note: 'Access modernization planning.' }
      ]
    },
    {
      id: 'TS-503', techId: 'T-03', weekStart: lastWeek, status: 'Approved', submittedAt: new Date(new Date(lastWeek).getTime() + 4 * DAY + 17 * 3600000).toISOString(), approvedBy: 'Daniel Kim',
      entries: [
        { id: 'TE-1', date: lastWeek, woId: 'WO-1044', projectId: null, type: 'Regular', hours: 8, billable: true, note: 'Access controller replacement.' },
        { id: 'TE-2', date: plusDays(lastWeek, 1), woId: 'WO-1049', projectId: null, type: 'Regular', hours: 8, billable: true, note: 'UPS battery site prep.' },
        { id: 'TE-3', date: plusDays(lastWeek, 2), woId: null, projectId: 'P-102', type: 'Regular', hours: 7.5, billable: true, note: 'Reader rollout zone 3.' },
        { id: 'TE-4', date: plusDays(lastWeek, 3), woId: 'WO-1055', projectId: null, type: 'Regular', hours: 7, billable: false, note: 'Lobby door closer and punch list.' },
        { id: 'TE-5', date: plusDays(lastWeek, 4), woId: null, projectId: 'P-104', type: 'Regular', hours: 7.5, billable: true, note: 'Solar feasibility review.' }
      ]
    },
    {
      id: 'TS-504', techId: 'T-04', weekStart: thisWeek, status: 'Draft', submittedAt: null, approvedBy: null,
      entries: [
        { id: 'TE-1', date: plusDays(thisWeek, 1), woId: 'WO-1051', projectId: null, type: 'Regular', hours: 2, billable: false, note: 'Emergency lighting compliance test.' },
        { id: 'TE-2', date: plusDays(thisWeek, 2), woId: 'WO-1053', projectId: null, type: 'Regular', hours: 2.5, billable: false, note: 'Fire panel inspection prep.' },
        { id: 'TE-3', date: plusDays(thisWeek, 3), woId: 'WO-1057', projectId: null, type: 'Travel', hours: 1.5, billable: false, note: 'Site travel — Lakeside.' }
      ]
    },
    {
      id: 'TS-505', techId: 'T-05', weekStart: thisWeek, status: 'Submitted', submittedAt: minutesAgo(310), approvedBy: null,
      entries: [
        { id: 'TE-1', date: thisWeek, woId: 'WO-1045', projectId: null, type: 'Regular', hours: 2, billable: true, note: 'Generator load test.' },
        { id: 'TE-2', date: plusDays(thisWeek, 1), woId: 'WO-1052', projectId: null, type: 'Regular', hours: 3, billable: true, note: 'Refrigerant leak check.' },
        { id: 'TE-3', date: plusDays(thisWeek, 2), woId: null, projectId: 'P-101', type: 'Regular', hours: 4, billable: true, note: 'Rooftop unit installation oversight.' },
        { id: 'TE-4', date: plusDays(thisWeek, 3), woId: 'WO-1056', projectId: null, type: 'Regular', hours: 2.5, billable: true, note: 'Filter change attempt — access issue.' },
        { id: 'TE-5', date: plusDays(thisWeek, 4), woId: null, projectId: 'P-101', type: 'Regular', hours: 4, billable: true, note: 'Commissioning checklist prep.' }
      ]
    }
  ];

  /* ------------------------------------------------------------------- leave */
  var leaveRequests = [
    { id: 'LV-201', techId: 'T-06', type: 'Annual', start: day(-1), end: day(3), days: 5, status: 'Approved', reason: 'Family trip — coverage arranged with East Division.', requested: day(-6), approver: 'Daniel Kim' },
    { id: 'LV-202', techId: 'T-04', type: 'Sick', start: day(-3), end: day(-3), days: 1, status: 'Approved', reason: 'Medical appointment.', requested: day(-4), approver: 'Daniel Kim' },
    { id: 'LV-203', techId: 'T-02', type: 'Study', start: day(7), end: day(9), days: 3, status: 'Pending', reason: 'Elevator certification course.', requested: day(-2), approver: 'Daniel Kim' },
    { id: 'LV-204', techId: 'T-03', type: 'Family Responsibility', start: day(14), end: day(15), days: 2, status: 'Approved', reason: 'Family care commitment.', requested: day(-6), approver: 'Sofia Reyes' },
    { id: 'LV-205', techId: 'T-01', type: 'Annual', start: day(30), end: day(34), days: 5, status: 'Pending', reason: 'Planned vacation.', requested: day(-1), approver: 'Daniel Kim' },
    { id: 'LV-206', techId: 'T-05', type: 'Sick', start: day(-9), end: day(-9), days: 1, status: 'Rejected', reason: 'No supporting documentation provided.', requested: day(-10), approver: 'Daniel Kim' }
  ];

  /* ---------------------------------------------------------- saved routes */
  var savedRoutes = [
    {
      id: 'RT-2081', name: 'North Metro — AM route', techId: 'T-01', date: day(0),
      stops: ['WO-1042', 'WO-1052', 'WO-1056'], status: 'Planned', distanceKm: 18.4, durationMin: 95
    },
    {
      id: 'RT-2082', name: 'South Hub morning loop', techId: 'T-04', date: day(0),
      stops: ['WO-1053', 'WO-1057'], status: 'Planned', distanceKm: 11.2, durationMin: 62
    },
    {
      id: 'RT-2083', name: 'West Region loop', techId: 'T-03', date: day(-1),
      stops: ['WO-1044', 'WO-1049'], status: 'Completed', distanceKm: 26.7, durationMin: 120
    }
  ];

  /* ------------------------------------------------------------ org config */
  var supportGroups = [
    { id: 'SG-01', name: 'North Metro', manager: 'Daniel Kim', members: 3, region: 'North', color: '#2563eb' },
    { id: 'SG-02', name: 'West Region', manager: 'Jamal Carter', members: 2, region: 'West', color: '#7c3aed' },
    { id: 'SG-03', name: 'South Hub', manager: 'Sofia Reyes', members: 2, region: 'South', color: '#db2777' },
    { id: 'SG-04', name: 'East Division', manager: 'Morgan Blake', members: 1, region: 'East', color: '#64748b' }
  ];

  var companies = [
    'Thrive Automation Services', 'Harborview Health', 'Metro Transit Authority', 'Cedar Retail Group',
    'Summit Cloud', 'Riverside Education', 'Aurora Holdings', 'Northgate Properties', 'Lakeside Living'
  ];

  /* ------------------------------------------------------------- activity */
  var activity = [
    { id: 'AC-1', at: minutesAgo(22), type: 'work', text: 'Alex Morgan started <strong>WO-1042</strong> at Harborview Medical Center.', by: 'Alex Morgan' },
    { id: 'AC-2', at: minutesAgo(58), type: 'status', text: 'Priya Sharma moved <strong>WO-1043</strong> to In Progress.', by: 'Priya Sharma' },
    { id: 'AC-3', at: minutesAgo(105), type: 'inventory', text: 'Receipt <strong>IMO-2071</strong> completed — 10 thermostat controllers received.', by: 'Daniel Kim' },
    { id: 'AC-4', at: minutesAgo(180), type: 'leave', text: 'Sofia Reyes approved sick leave request <strong>LV-202</strong>.', by: 'Sofia Reyes' },
    { id: 'AC-5', at: minutesAgo(300), type: 'project', text: 'Rooftop unit installation milestone updated to <strong>70%</strong>.', by: 'Daniel Kim' },
    { id: 'AC-6', at: minutesAgo(420), type: 'checklist', text: 'Retail emergency lighting checklist <strong>CHK-305</strong> completed.', by: 'Sofia Reyes' }
  ];

  /* -------------------------------------------------------- notifications */
  var notifications = [
    { id: 'N-1', title: 'Critical work order assigned', text: 'WO-1043 · Elevator car 2 door fault is assigned to Priya Sharma.', time: minutesAgo(12), read: false, type: 'critical', target: 'WO-1043' },
    { id: 'N-2', title: 'Low stock alert', text: 'Access Control Board (3 on hand) is below the reorder point of 5.', time: minutesAgo(64), read: false, type: 'inventory', target: 'I-04' },
    { id: 'N-3', title: 'Timesheet submitted', text: 'Priya Sharma submitted timesheet TS-502 for approval.', time: minutesAgo(135), read: true, type: 'timesheet', target: 'TS-502' },
    { id: 'N-4', title: 'Checklist due today', text: 'CHK-301 · Fire safety walkthrough is due today at Harborview.', time: minutesAgo(200), read: true, type: 'checklist', target: 'CHK-301' }
  ];

  window.FSM_SEED = {
    _version: 1,
    generatedAt: now.toISOString(),
    technicians: technicians,
    sites: sites,
    assets: assets,
    warehouses: warehouses,
    inventory: inventory,
    movements: movements,
    projects: projects,
    workOrderTemplates: workOrderTemplates,
    checklistTemplates: checklistTemplates,
    checklists: checklists,
    workOrders: workOrders,
    timesheets: timesheets,
    leaveRequests: leaveRequests,
    savedRoutes: savedRoutes,
    supportGroups: supportGroups,
    companies: companies,
    activity: activity,
    notifications: notifications
  };
})();
