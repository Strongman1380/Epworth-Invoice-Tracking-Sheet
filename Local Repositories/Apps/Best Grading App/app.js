// Core state
const CLASSES = ["Psychology","Street Law","Independent Living","Spelling"];
const MAX_ASSIGNMENT = 10;
const MAX_TEST = 20;

// Storage keys
const STORAGE_KEYS = {
  ROSTER: 'best-grader-roster-v2',
  DAILY_DATA: 'best-grader-daily-data-v2',
  CURRENT_DATE: 'best-grader-current-date-v2',
  STUDENT_PROFILES: 'best-grader-student-profiles-v2',
  SETTINGS: 'best-grader-settings-v2'
};

// Enhanced data structures
let roster = []; // [{ id, name, dateAdded, isActive }]
let studentProfiles = {}; // { studentId: { personalInfo, contactInfo, academicInfo, customFields } }
let dailyData = {}; // { date: { studentId: { assignments: {}, tests: {} } } }
let students = []; // working set for current date
let currentDate = '';

function todayStr(){ return new Date().toISOString().slice(0,10); }
function generateId(){ return Date.now().toString(36) + Math.random().toString(36).substr(2); }

// Enhanced persistence helpers
function loadRoster(){
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ROSTER);
    roster = data ? JSON.parse(data) : [];
  } catch(e){ 
    console.warn('Failed to load roster', e); 
    roster = []; 
  }
}

function saveRoster(){
  try {
    localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(roster));
  } catch(e){ 
    console.warn('Failed to save roster', e); 
  }
}

function loadStudentProfiles(){
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENT_PROFILES);
    studentProfiles = data ? JSON.parse(data) : {};
  } catch(e){ 
    console.warn('Failed to load student profiles', e); 
    studentProfiles = {}; 
  }
}

function saveStudentProfiles(){
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_PROFILES, JSON.stringify(studentProfiles));
  } catch(e){ 
    console.warn('Failed to save student profiles', e); 
  }
}

function loadDailyData(){
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_DATA);
    dailyData = data ? JSON.parse(data) : {};
  } catch(e){ 
    console.warn('Failed to load daily data', e); 
    dailyData = {}; 
  }
}

function saveDailyData(){
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_DATA, JSON.stringify(dailyData));
  } catch(e){ 
    console.warn('Failed to save daily data', e); 
  }
}

function addStudentToRoster(name, additionalInfo = {}){
  const id = generateId();
  const student = {
    id,
    name: name.trim(),
    dateAdded: todayStr(),
    isActive: true
  };
  
  roster.push(student);
  
  // Create student profile with additional information
  studentProfiles[id] = {
    personalInfo: {
      firstName: additionalInfo.firstName || '',
      lastName: additionalInfo.lastName || '',
      studentId: additionalInfo.studentId || '',
      dateOfBirth: additionalInfo.dateOfBirth || '',
      grade: additionalInfo.grade || ''
    },
    contactInfo: {
      email: additionalInfo.email || '',
      phone: additionalInfo.phone || '',
      parentEmail: additionalInfo.parentEmail || '',
      parentPhone: additionalInfo.parentPhone || '',
      address: additionalInfo.address || ''
    },
    academicInfo: {
      enrollmentDate: additionalInfo.enrollmentDate || todayStr(),
      previousSchool: additionalInfo.previousSchool || '',
      specialNeeds: additionalInfo.specialNeeds || '',
      notes: additionalInfo.notes || ''
    },
    customFields: additionalInfo.customFields || {}
  };
  
  saveRoster();
  saveStudentProfiles();
  return student;
}

function saveDay(date){
  if (!dailyData[date]) {
    dailyData[date] = {};
  }
  
  students.forEach(student => {
    dailyData[date][student.id] = {
      assignments: { ...student.scores.assignments },
      tests: { ...student.scores.tests }
    };
  });
  
  saveDailyData();
}

function loadDay(date){
  const dayData = dailyData[date] || {};
  students = roster.filter(r => r.isActive).map(r => {
    const scores = dayData[r.id] || { assignments: {}, tests: {} };
    return {
      id: r.id,
      name: r.name,
      scores: {
        assignments: { ...scores.assignments },
        tests: { ...scores.tests }
      }
    };
  });
}
function initDate(){
  const input = document.getElementById('gradeDate');
  currentDate = localStorage.getItem(STORAGE_KEYS.CURRENT_DATE) || todayStr();
  if(input){
    input.value = currentDate;
    input.addEventListener('change', ()=>{
      saveDay(currentDate); // save current work
      currentDate = input.value || todayStr();
      localStorage.setItem(STORAGE_KEYS.CURRENT_DATE, currentDate);
      loadDay(currentDate);
      renderAll();
    });
  }
}

// Utility functions
function pct(score, max){ if(score==='' || score==null || isNaN(score)) return null; return (score / max) * 100; }
function letter(percentage){ if(percentage==null) return ''; if(percentage>=90) return 'A'; if(percentage>=80) return 'B'; if(percentage>=70) return 'C'; if(percentage>=60) return 'D'; return 'F'; }
function createEl(tag, props={}, children=[]) { const el = document.createElement(tag); Object.assign(el, props); children.forEach(c=> el.append(c)); return el; }

function addStudent(name, additionalInfo = {}){
  try {
    const entry = addStudentToRoster(name, additionalInfo);
    // ensure working set has new student for the current date
    students.push({ id: entry.id, name: entry.name, scores:{ assignments:{}, tests:{} } });
    saveDay(currentDate);
    renderAll();
    return entry;
  } catch(e) { 
    console.warn('Failed to add student:', e);
    throw e;
  }
}

// Input factories
function buildScoreInput(type, studentId, className){
  const isSpelling = className === 'Spelling';
  if(isSpelling){
    const select = createEl('select');
    ['', 'Pass','Fail'].forEach(v=> select.append(new Option(v||'—', v)));
    select.addEventListener('change', ()=> { setScore(type, studentId, className, select.value); });
    const existing = getScore(type, studentId, className);
    if(existing!=null) select.value = existing;
    return select;
  }
  const max = type === 'assignments' ? MAX_ASSIGNMENT : MAX_TEST;
  const input = createEl('input', { type:'number', min:0, max, step:1 });
  input.addEventListener('input', ()=> { let v = input.value; if(v==='') { setScore(type, studentId, className, ''); return; } const n = Number(v); if(n<0) input.value=0; else if(n>max) input.value=max; setScore(type, studentId, className, Number(input.value)); });
  const existing = getScore(type, studentId, className);
  if(existing!==undefined) input.value = existing;
  return input;
}

function getStudent(id){ return students.find(s=> s.id===id); }
function getScore(type, id, className){ const st = getStudent(id); if(!st) return undefined; return st.scores[type][className]; }
function setScore(type, id, className, value){
  const st = getStudent(id);
  st.scores[type][className] = value;
  saveDay(currentDate); // auto-save for the selected date
  renderSummaryTable();
}

// Unified table rendering system
function createUnifiedTable() {
  const table = createEl('table');
  const thead = createEl('thead');
  const headRow = createEl('tr');
  
  // Standard header structure
  headRow.append(createEl('th', {textContent: 'Student'}));
  CLASSES.forEach(c => headRow.append(createEl('th', {textContent: c})));
  
  thead.append(headRow);
  table.append(thead);
  
  return { table, tbody: createEl('tbody') };
}

function renderScoreTable(type){
  const container = document.getElementById(type === 'assignments' ? 'assignmentTableContainer' : 'testTableContainer');
  container.innerHTML = '';
  
  const { table, tbody } = createUnifiedTable();
  
  students.forEach(st => {
    const tr = createEl('tr');
    tr.append(createEl('td', {textContent: st.name}));
    
    CLASSES.forEach(c => {
      const td = createEl('td');
      td.append(buildScoreInput(type, st.id, c));
      
      if(c !== 'Spelling'){ // add small computed pct + letter under input
        const wrap = createEl('div', {className: 'small'});
        td.append(wrap);
        const update = () => {
          const val = getScore(type, st.id, c);
          if(val === '' || val == null) { 
            wrap.textContent = ''; 
            return; 
          }
          const max = type === 'assignments' ? MAX_ASSIGNMENT : MAX_TEST;
          const p = pct(val, max);
          wrap.textContent = p.toFixed(0) + '% ' + letter(p);
        };
        td.querySelector('input')?.addEventListener('input', update);
        update();
      }
      tr.append(td);
    });
    tbody.append(tr);
  });
  
  table.append(tbody);
  container.append(table);
}

function renderSummaryTable(){
  const container = document.getElementById('summaryTableContainer');
  container.innerHTML = '';
  
  const { table, tbody } = createUnifiedTable();
  
  students.forEach(st => {
    const tr = createEl('tr');
    tr.append(createEl('td', {textContent: st.name}));
    
    CLASSES.forEach(c => {
      const td = createEl('td');
      
      if(c === 'Spelling'){
        const a = getScore('assignments', st.id, c);
        const t = getScore('tests', st.id, c);
        const isPass = (t === 'Pass') || (a === 'Pass');
        const isFail = (t === 'Fail') || (a === 'Fail');
        
        if(isPass){
          const span = createEl('span', {className: 'grade-badge pass', textContent: '+1'});
          td.append(span);
        } else if(isFail){
          const span = createEl('span', {className: 'grade-badge warn', textContent: 'Re-do'});
          td.append(span);
        } else {
          td.textContent = '';
        }
      } else {
        // combine assignment + test weighting simple average of percentages
        const a = getScore('assignments', st.id, c);
        const t = getScore('tests', st.id, c);
        let aP = a === '' || a == null ? null : pct(a, MAX_ASSIGNMENT);
        let tP = t === '' || t == null ? null : pct(t, MAX_TEST);
        let combined = null;
        
        if(aP != null && tP != null) {
          combined = (aP + tP) / 2;
        } else if(aP != null) {
          combined = aP;
        } else if(tP != null) {
          combined = tP;
        }
        
        if(combined == null){ 
          td.textContent = ''; 
        } else {
          const span = createEl('span', {
            className: 'grade-badge', 
            textContent: combined.toFixed(0) + '% ' + letter(combined)
          });
          if(combined < 60) {
            span.classList.add('danger');
          } else if(combined < 70) {
            span.classList.add('warn');
          }
          td.append(span);
        }
      }
      tr.append(td);
    });
    tbody.append(tr);
  });
  
  table.append(tbody);
  container.append(table);
}

function renderAll(){ renderScoreTable('assignments'); renderScoreTable('tests'); renderSummaryTable(); }

// Build printable daily report for the selected date
function printDailyReport(){
  const date = currentDate || todayStr();
  let html = '';
  html += '<h1 style="font-family: \'Baloo 2\', system-ui, sans-serif; margin:0 0 12px;">Grades Report - '+date+'</h1>';
  html += '<h2 style="font-family: \'Baloo 2\', system-ui, sans-serif; margin:8px 0;">Assignments (Out of '+MAX_ASSIGNMENT+')</h2>';
  html += buildSimpleTable('assignments');
  html += '<h2 style="font-family: \'Baloo 2\', system-ui, sans-serif; margin:16px 0 8px;">Tests (Out of '+MAX_TEST+')</h2>';
  html += buildSimpleTable('tests');
  html += '<h2 style="font-family: \'Baloo 2\', system-ui, sans-serif; margin:16px 0 8px;">Summary Grades</h2>';
  html += buildSummaryTableHTML();

  const win = window.open('', '_blank');
  if(!win){ alert('Please allow popups to print the report.'); return; }
  win.document.write('<!doctype html><html><head><title>Grades Report '+date+'</title>'+
    '<meta charset="utf-8" />'+
    '<style>body{font-family:Nunito,system-ui,sans-serif;padding:24px;color:#033} table{border-collapse:collapse;width:100%;margin:8px 0} th,td{border:1px solid #999;padding:6px 8px;font-size:12px} th{text-align:left;background:#f3f6f9} h1,h2{color:#044466} @media print{ .no-print{display:none} }</style>'+
    '</head><body>'+html+'<script>window.onload=function(){window.print();}</script></body></html>');
  win.document.close();
}

function buildSimpleTable(type){
  const max = type==='assignments'?MAX_ASSIGNMENT:MAX_TEST;
  let t = '<table><thead><tr><th>Student</th>';
  CLASSES.forEach(c=>{ t += '<th>'+c+'</th>'; });
  t += '</tr></thead><tbody>';
  students.forEach(st=>{
    t += '<tr><td>'+escapeHTML(st.name)+'</td>';
    CLASSES.forEach(c=>{
      const val = getScore(type, st.id, c);
      if(c==='Spelling'){
        t += '<td>'+(val||'')+'</td>';
      } else {
        const v = (val===''||val==null)?'':String(val);
        const p = (v==='')?'' : Math.round(pct(Number(v), max))+'%';
        t += '<td>'+v+(p?(' ('+p+')'):'')+'</td>';
      }
    });
    t += '</tr>';
  });
  t += '</tbody></table>';
  return t;
}

function buildSummaryTableHTML(){
  let t = '<table><thead><tr><th>Student</th>';
  CLASSES.forEach(c=>{ t += '<th>'+c+'</th>'; });
  t += '</tr></thead><tbody>';
  students.forEach(st=>{
    t += '<tr><td>'+escapeHTML(st.name)+'</td>';
    CLASSES.forEach(c=>{
      if(c==='Spelling'){
        const a = getScore('assignments', st.id, c);
        const tScore = getScore('tests', st.id, c);
        const val = (tScore || a || '')+'';
        t += '<td>'+val+'</td>';
      } else {
        const a = getScore('assignments', st.id, c);
        const tt = getScore('tests', st.id, c);
        let aP = a===''||a==null?null:pct(a,MAX_ASSIGNMENT);
        let tP = tt===''||tt==null?null:pct(tt,MAX_TEST);
        let combined = null;
        if(aP!=null && tP!=null) combined = (aP + tP)/2; else if(aP!=null) combined = aP; else if(tP!=null) combined = tP;
        t += '<td>'+(combined==null?'':(Math.round(combined)+'% '+letter(combined)))+'</td>';
      }
    });
    t += '</tr>';
  });
  t += '</tbody></table>';
  return t;
}

function escapeHTML(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// Init
function init() {
  loadRoster();
  loadStudentProfiles();
  loadDailyData();
  
  // Try to migrate old data if no new data exists
  if (roster.length === 0) {
    migrateOldData();
  }
  
  initDate();
  loadDay(currentDate);
  renderAll();
  
  // Initialize new features
  initTabSystem();
  initCumulativeControls();
}
init();

// Buttons and form handlers
const addForm = document.getElementById('addStudentForm');
addForm.addEventListener('submit', e=> {
  e.preventDefault();
  const nameEl = document.getElementById('studentName');
  const name = nameEl.value.trim();
  if(!name) return;
  addStudent(name);
  nameEl.value = '';
  nameEl.focus();
});

const saveBtn = document.getElementById('saveGradesBtn');
if(saveBtn){ saveBtn.addEventListener('click', ()=> { saveDay(currentDate); alert('Grades saved for ' + currentDate); }); }

const printBtn = document.getElementById('printReportBtn');
if(printBtn){ printBtn.addEventListener('click', ()=> { printDailyReport(); }); }

// New button event listeners
const addDetailedBtn = document.getElementById('addDetailedStudentBtn');
if(addDetailedBtn){ addDetailedBtn.addEventListener('click', showDetailedStudentForm); }

const exportDataBtn = document.getElementById('exportDataBtn');
if(exportDataBtn){ exportDataBtn.addEventListener('click', exportAllData); }

const exportCSVBtn = document.getElementById('exportCSVBtn');
if(exportCSVBtn){ exportCSVBtn.addEventListener('click', exportCSV); }

const importDataFile = document.getElementById('importDataFile');
if(importDataFile){ 
  importDataFile.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      importData(file);
      e.target.value = ''; // Reset file input
    }
  });
}

const viewStatsBtn = document.getElementById('viewStatsBtn');
if(viewStatsBtn){ viewStatsBtn.addEventListener('click', showStatistics); }

const manageStudentsBtn = document.getElementById('manageStudentsBtn');
if(manageStudentsBtn){ manageStudentsBtn.addEventListener('click', showStudentManagement); }

// Close modal when clicking outside
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) {
    closeModal();
  }
});

// Data Management Functions
function exportAllData() {
  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    roster,
    studentProfiles,
    dailyData,
    metadata: {
      totalStudents: roster.length,
      activeStudents: roster.filter(s => s.isActive).length,
      totalDays: Object.keys(dailyData).length,
      classes: CLASSES
    }
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `best-grader-backup-${todayStr()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importData = JSON.parse(e.target.result);
      
      if (importData.version && importData.roster && importData.studentProfiles && importData.dailyData) {
        // Backup current data
        const backupData = {
          roster: [...roster],
          studentProfiles: {...studentProfiles},
          dailyData: {...dailyData}
        };
        localStorage.setItem('best-grader-backup-' + Date.now(), JSON.stringify(backupData));
        
        // Import new data
        roster = importData.roster;
        studentProfiles = importData.studentProfiles;
        dailyData = importData.dailyData;
        
        // Save to localStorage
        saveRoster();
        saveStudentProfiles();
        saveDailyData();
        
        // Refresh current view
        loadDay(currentDate);
        renderAll();
        
        alert('Data imported successfully! A backup of your previous data has been saved.');
      } else {
        alert('Invalid file format. Please select a valid backup file.');
      }
    } catch (error) {
      alert('Error importing data: ' + error.message);
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  // Create comprehensive CSV with all student data and grades
  let csv = 'Student Name,Student ID,Date Added,Status,';
  
  // Add class headers for assignments and tests
  CLASSES.forEach(cls => {
    csv += `${cls} Assignment,${cls} Assignment %,${cls} Test,${cls} Test %,${cls} Final Grade,`;
  });
  
  // Add profile headers
  csv += 'Email,Phone,Parent Email,Parent Phone,Grade,Date of Birth,Enrollment Date,Special Needs,Notes\n';
  
  // Add data for each student
  roster.forEach(student => {
    const profile = studentProfiles[student.id] || {};
    const personalInfo = profile.personalInfo || {};
    const contactInfo = profile.contactInfo || {};
    const academicInfo = profile.academicInfo || {};
    
    csv += `"${student.name}","${personalInfo.studentId || ''}","${student.dateAdded}","${student.isActive ? 'Active' : 'Inactive'}",`;
    
    // Add grades for each class
    CLASSES.forEach(cls => {
      let assignmentScore = '';
      let assignmentPct = '';
      let testScore = '';
      let testPct = '';
      let finalGrade = '';
      
      // Get most recent scores (from current date or latest available)
      const recentData = dailyData[currentDate] || {};
      const studentData = recentData[student.id] || { assignments: {}, tests: {} };
      
      if (cls === 'Spelling') {
        assignmentScore = studentData.assignments[cls] || '';
        testScore = studentData.tests[cls] || '';
        const isPass = (testScore === 'Pass') || (assignmentScore === 'Pass');
        const isFail = (testScore === 'Fail') || (assignmentScore === 'Fail');
        finalGrade = isPass ? 'Pass' : (isFail ? 'Fail' : '');
      } else {
        const aScore = studentData.assignments[cls];
        const tScore = studentData.tests[cls];
        
        if (aScore !== undefined && aScore !== '') {
          assignmentScore = aScore;
          assignmentPct = pct(aScore, MAX_ASSIGNMENT)?.toFixed(1) || '';
        }
        
        if (tScore !== undefined && tScore !== '') {
          testScore = tScore;
          testPct = pct(tScore, MAX_TEST)?.toFixed(1) || '';
        }
        
        // Calculate final grade
        let aP = aScore === '' || aScore == null ? null : pct(aScore, MAX_ASSIGNMENT);
        let tP = tScore === '' || tScore == null ? null : pct(tScore, MAX_TEST);
        let combined = null;
        if (aP != null && tP != null) combined = (aP + tP) / 2;
        else if (aP != null) combined = aP;
        else if (tP != null) combined = tP;
        
        if (combined != null) {
          finalGrade = combined.toFixed(1) + '% ' + letter(combined);
        }
      }
      
      csv += `"${assignmentScore}","${assignmentPct}","${testScore}","${testPct}","${finalGrade}",`;
    });
    
    // Add profile information
    csv += `"${contactInfo.email || ''}","${contactInfo.phone || ''}","${contactInfo.parentEmail || ''}","${contactInfo.parentPhone || ''}","${personalInfo.grade || ''}","${personalInfo.dateOfBirth || ''}","${academicInfo.enrollmentDate || ''}","${academicInfo.specialNeeds || ''}","${academicInfo.notes || ''}"\n`;
  });
  
  const csvBlob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(csvBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `best-grader-data-${todayStr()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getStudentHistory(studentId) {
  const history = {};
  Object.keys(dailyData).forEach(date => {
    if (dailyData[date][studentId]) {
      history[date] = dailyData[date][studentId];
    }
  });
  return history;
}

function getClassStatistics() {
  const stats = {};
  
  CLASSES.forEach(className => {
    stats[className] = {
      assignments: { total: 0, completed: 0, average: 0 },
      tests: { total: 0, completed: 0, average: 0 },
      finalGrades: { A: 0, B: 0, C: 0, D: 0, F: 0, Pass: 0, Fail: 0, Incomplete: 0 }
    };
  });
  
  // Calculate statistics from current day data
  const currentData = dailyData[currentDate] || {};
  const activeStudents = roster.filter(s => s.isActive);
  
  activeStudents.forEach(student => {
    const studentData = currentData[student.id] || { assignments: {}, tests: {} };
    
    CLASSES.forEach(className => {
      const assignmentScore = studentData.assignments[className];
      const testScore = studentData.tests[className];
      
      // Assignment stats
      stats[className].assignments.total++;
      if (assignmentScore !== undefined && assignmentScore !== '') {
        stats[className].assignments.completed++;
        if (className !== 'Spelling') {
          stats[className].assignments.average += pct(assignmentScore, MAX_ASSIGNMENT);
        }
      }
      
      // Test stats
      stats[className].tests.total++;
      if (testScore !== undefined && testScore !== '') {
        stats[className].tests.completed++;
        if (className !== 'Spelling') {
          stats[className].tests.average += pct(testScore, MAX_TEST);
        }
      }
      
      // Final grade stats
      if (className === 'Spelling') {
        const isPass = (testScore === 'Pass') || (assignmentScore === 'Pass');
        const isFail = (testScore === 'Fail') || (assignmentScore === 'Fail');
        if (isPass) stats[className].finalGrades.Pass++;
        else if (isFail) stats[className].finalGrades.Fail++;
        else stats[className].finalGrades.Incomplete++;
      } else {
        let aP = assignmentScore === '' || assignmentScore == null ? null : pct(assignmentScore, MAX_ASSIGNMENT);
        let tP = testScore === '' || testScore == null ? null : pct(testScore, MAX_TEST);
        let combined = null;
        if (aP != null && tP != null) combined = (aP + tP) / 2;
        else if (aP != null) combined = aP;
        else if (tP != null) combined = tP;
        
        if (combined != null) {
          const letterGrade = letter(combined);
          stats[className].finalGrades[letterGrade]++;
        } else {
          stats[className].finalGrades.Incomplete++;
        }
      }
    });
  });
  
  // Calculate averages
  CLASSES.forEach(className => {
    if (stats[className].assignments.completed > 0) {
      stats[className].assignments.average /= stats[className].assignments.completed;
    }
    if (stats[className].tests.completed > 0) {
      stats[className].tests.average /= stats[className].tests.completed;
    }
  });
  
  return stats;
}

// Modal Functions
function showModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

// Detailed Student Form
function showDetailedStudentForm() {
  const formHTML = `
    <form id="detailedStudentForm" class="detailed-form">
      <div class="form-section">
        <h4>Basic Information</h4>
        <div class="form-row">
          <label>Full Name: <input type="text" name="name" required /></label>
          <label>Student ID: <input type="text" name="studentId" /></label>
        </div>
        <div class="form-row">
          <label>First Name: <input type="text" name="firstName" /></label>
          <label>Last Name: <input type="text" name="lastName" /></label>
        </div>
        <div class="form-row">
          <label>Date of Birth: <input type="date" name="dateOfBirth" /></label>
          <label>Grade: <input type="text" name="grade" /></label>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Contact Information</h4>
        <div class="form-row">
          <label>Email: <input type="email" name="email" /></label>
          <label>Phone: <input type="tel" name="phone" /></label>
        </div>
        <div class="form-row">
          <label>Parent Email: <input type="email" name="parentEmail" /></label>
          <label>Parent Phone: <input type="tel" name="parentPhone" /></label>
        </div>
        <div class="form-row">
          <label>Address: <textarea name="address" rows="2"></textarea></label>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Academic Information</h4>
        <div class="form-row">
          <label>Enrollment Date: <input type="date" name="enrollmentDate" /></label>
          <label>Previous School: <input type="text" name="previousSchool" /></label>
        </div>
        <div class="form-row">
          <label>Special Needs: <textarea name="specialNeeds" rows="2"></textarea></label>
        </div>
        <div class="form-row">
          <label>Notes: <textarea name="notes" rows="3"></textarea></label>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn primary">Add Student</button>
        <button type="button" class="btn outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
  
  showModal('Add Student with Details', formHTML);
  
  // Handle form submission
  document.getElementById('detailedStudentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentData = {};
    
    for (let [key, value] of formData.entries()) {
      studentData[key] = value;
    }
    
    const name = studentData.name;
    delete studentData.name;
    
    addStudent(name, studentData);
    closeModal();
  });
}

// Statistics View
function showStatistics() {
  const stats = getClassStatistics();
  
  let statsHTML = '<div class="statistics-container">';
  
  CLASSES.forEach(className => {
    const classStats = stats[className];
    statsHTML += `
      <div class="class-stats">
        <h4>${className}</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <label>Assignments Completed:</label>
            <span>${classStats.assignments.completed}/${classStats.assignments.total}</span>
          </div>
          <div class="stat-item">
            <label>Tests Completed:</label>
            <span>${classStats.tests.completed}/${classStats.tests.total}</span>
          </div>
    `;
    
    if (className !== 'Spelling') {
      statsHTML += `
          <div class="stat-item">
            <label>Assignment Average:</label>
            <span>${classStats.assignments.average.toFixed(1)}%</span>
          </div>
          <div class="stat-item">
            <label>Test Average:</label>
            <span>${classStats.tests.average.toFixed(1)}%</span>
          </div>
      `;
    }
    
    statsHTML += `
          <div class="stat-item grade-distribution">
            <label>Grade Distribution:</label>
            <div class="grade-counts">
    `;
    
    Object.entries(classStats.finalGrades).forEach(([grade, count]) => {
      if (count > 0) {
        statsHTML += `<span class="grade-count">${grade}: ${count}</span>`;
      }
    });
    
    statsHTML += `
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  statsHTML += '</div>';
  
  showModal('Class Statistics', statsHTML);
}

// Student Management
function showStudentManagement() {
  let managementHTML = `
    <div class="student-management">
      <div class="management-actions">
        <button type="button" class="btn outline" onclick="exportStudentList()">Export Student List</button>
        <button type="button" class="btn outline" onclick="showInactiveStudents()">Show Inactive</button>
      </div>
      <div class="student-list">
  `;
  
  roster.forEach(student => {
    const profile = studentProfiles[student.id] || {};
    const personalInfo = profile.personalInfo || {};
    const contactInfo = profile.contactInfo || {};
    
    managementHTML += `
      <div class="student-item ${student.isActive ? 'active' : 'inactive'}">
        <div class="student-info">
          <h5>${student.name}</h5>
          <p>ID: ${personalInfo.studentId || 'N/A'} | Added: ${student.dateAdded}</p>
          <p>Email: ${contactInfo.email || 'N/A'} | Phone: ${contactInfo.phone || 'N/A'}</p>
        </div>
        <div class="student-actions">
          <button type="button" class="btn small outline" onclick="editStudent('${student.id}')">Edit</button>
          <button type="button" class="btn small ${student.isActive ? 'danger' : 'primary'}" 
                  onclick="toggleStudentStatus('${student.id}')">
            ${student.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    `;
  });
  
  managementHTML += '</div></div>';
  
  showModal('Manage Students', managementHTML);
}

function toggleStudentStatus(studentId) {
  const student = roster.find(s => s.id === studentId);
  if (student) {
    student.isActive = !student.isActive;
    saveRoster();
    loadDay(currentDate); // Refresh current day view
    renderAll();
    showStudentManagement(); // Refresh the management view
  }
}

function editStudent(studentId) {
  const student = roster.find(s => s.id === studentId);
  const profile = studentProfiles[studentId] || {};
  const personalInfo = profile.personalInfo || {};
  const contactInfo = profile.contactInfo || {};
  const academicInfo = profile.academicInfo || {};
  
  const formHTML = `
    <form id="editStudentForm" class="detailed-form">
      <div class="form-section">
        <h4>Basic Information</h4>
        <div class="form-row">
          <label>Full Name: <input type="text" name="name" value="${student.name}" required /></label>
          <label>Student ID: <input type="text" name="studentId" value="${personalInfo.studentId || ''}" /></label>
        </div>
        <div class="form-row">
          <label>First Name: <input type="text" name="firstName" value="${personalInfo.firstName || ''}" /></label>
          <label>Last Name: <input type="text" name="lastName" value="${personalInfo.lastName || ''}" /></label>
        </div>
        <div class="form-row">
          <label>Date of Birth: <input type="date" name="dateOfBirth" value="${personalInfo.dateOfBirth || ''}" /></label>
          <label>Grade: <input type="text" name="grade" value="${personalInfo.grade || ''}" /></label>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Contact Information</h4>
        <div class="form-row">
          <label>Email: <input type="email" name="email" value="${contactInfo.email || ''}" /></label>
          <label>Phone: <input type="tel" name="phone" value="${contactInfo.phone || ''}" /></label>
        </div>
        <div class="form-row">
          <label>Parent Email: <input type="email" name="parentEmail" value="${contactInfo.parentEmail || ''}" /></label>
          <label>Parent Phone: <input type="tel" name="parentPhone" value="${contactInfo.parentPhone || ''}" /></label>
        </div>
        <div class="form-row">
          <label>Address: <textarea name="address" rows="2">${contactInfo.address || ''}</textarea></label>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Academic Information</h4>
        <div class="form-row">
          <label>Enrollment Date: <input type="date" name="enrollmentDate" value="${academicInfo.enrollmentDate || ''}" /></label>
          <label>Previous School: <input type="text" name="previousSchool" value="${academicInfo.previousSchool || ''}" /></label>
        </div>
        <div class="form-row">
          <label>Special Needs: <textarea name="specialNeeds" rows="2">${academicInfo.specialNeeds || ''}</textarea></label>
        </div>
        <div class="form-row">
          <label>Notes: <textarea name="notes" rows="3">${academicInfo.notes || ''}</textarea></label>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn primary">Update Student</button>
        <button type="button" class="btn outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
  
  showModal('Edit Student', formHTML);
  
  // Handle form submission
  document.getElementById('editStudentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentData = {};
    
    for (let [key, value] of formData.entries()) {
      studentData[key] = value;
    }
    
    // Update student name
    student.name = studentData.name;
    delete studentData.name;
    
    // Update profile
    if (!studentProfiles[studentId]) {
      studentProfiles[studentId] = { personalInfo: {}, contactInfo: {}, academicInfo: {}, customFields: {} };
    }
    
    const profile = studentProfiles[studentId];
    profile.personalInfo = {
      firstName: studentData.firstName || '',
      lastName: studentData.lastName || '',
      studentId: studentData.studentId || '',
      dateOfBirth: studentData.dateOfBirth || '',
      grade: studentData.grade || ''
    };
    profile.contactInfo = {
      email: studentData.email || '',
      phone: studentData.phone || '',
      parentEmail: studentData.parentEmail || '',
      parentPhone: studentData.parentPhone || '',
      address: studentData.address || ''
    };
    profile.academicInfo = {
      enrollmentDate: studentData.enrollmentDate || '',
      previousSchool: studentData.previousSchool || '',
      specialNeeds: studentData.specialNeeds || '',
      notes: studentData.notes || ''
    };
    
    saveRoster();
    saveStudentProfiles();
    loadDay(currentDate); // Refresh current day view
    renderAll();
    closeModal();
  });
}

// Additional utility functions
function exportStudentList() {
  let csv = 'Student Name,Student ID,Date Added,Status,Email,Phone,Parent Email,Parent Phone,Grade,Date of Birth,Enrollment Date,Special Needs,Notes\n';
  
  roster.forEach(student => {
    const profile = studentProfiles[student.id] || {};
    const personalInfo = profile.personalInfo || {};
    const contactInfo = profile.contactInfo || {};
    const academicInfo = profile.academicInfo || {};
    
    csv += `"${student.name}","${personalInfo.studentId || ''}","${student.dateAdded}","${student.isActive ? 'Active' : 'Inactive'}","${contactInfo.email || ''}","${contactInfo.phone || ''}","${contactInfo.parentEmail || ''}","${contactInfo.parentPhone || ''}","${personalInfo.grade || ''}","${personalInfo.dateOfBirth || ''}","${academicInfo.enrollmentDate || ''}","${academicInfo.specialNeeds || ''}","${academicInfo.notes || ''}"\n`;
  });
  
  const csvBlob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(csvBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `student-list-${todayStr()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function showInactiveStudents() {
  const inactiveStudents = roster.filter(s => !s.isActive);
  
  if (inactiveStudents.length === 0) {
    alert('No inactive students found.');
    return;
  }
  
  let html = '<div class="inactive-students-list"><h4>Inactive Students</h4>';
  
  inactiveStudents.forEach(student => {
    const profile = studentProfiles[student.id] || {};
    const personalInfo = profile.personalInfo || {};
    
    html += `
      <div class="student-item inactive">
        <div class="student-info">
          <h5>${student.name}</h5>
          <p>ID: ${personalInfo.studentId || 'N/A'} | Deactivated: ${student.dateAdded}</p>
        </div>
        <div class="student-actions">
          <button type="button" class="btn small primary" onclick="toggleStudentStatus('${student.id}'); showInactiveStudents();">Reactivate</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  showModal('Inactive Students', html);
}

// Data migration function for users upgrading from old version
function migrateOldData() {
  try {
    // Check for old data format
    const oldRoster = localStorage.getItem('best-grader-v1');
    if (oldRoster && roster.length === 0) {
      const oldData = JSON.parse(oldRoster);
      
      if (oldData.students && Array.isArray(oldData.students)) {
        oldData.students.forEach(oldStudent => {
          if (oldStudent.name) {
            addStudentToRoster(oldStudent.name, {
              studentId: oldStudent.id || '',
              enrollmentDate: oldStudent.dateAdded || todayStr()
            });
          }
        });
        
        // Migrate old daily data if available
        if (oldData.dailyData) {
          Object.keys(oldData.dailyData).forEach(date => {
            dailyData[date] = oldData.dailyData[date];
          });
          saveDailyData();
        }
        
        console.log('Successfully migrated old data format');
        alert('Your data has been migrated to the new format with enhanced features!');
      }
    }
  } catch (e) {
    console.warn('Failed to migrate old data:', e);
  }
}

// ===== CUMULATIVE GRADES SYSTEM =====

// Tab switching functionality
function initTabSystem() {
  const dailyViewBtn = document.getElementById('dailyViewBtn');
  const cumulativeViewBtn = document.getElementById('cumulativeViewBtn');
  const dailyView = document.getElementById('dailyView');
  const cumulativeView = document.getElementById('cumulativeView');
  
  function switchTab(activeTab) {
    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${activeTab}"]`).classList.add('active');
    
    // Show/hide views
    if (activeTab === 'daily') {
      dailyView.style.display = '';
      cumulativeView.style.display = 'none';
    } else {
      dailyView.style.display = 'none';
      cumulativeView.style.display = '';
      renderCumulativeTable();
    }
  }
  
  dailyViewBtn?.addEventListener('click', () => switchTab('daily'));
  cumulativeViewBtn?.addEventListener('click', () => switchTab('cumulative'));
}

// Calculate cumulative statistics for a student
function calculateCumulativeStats(studentId, dateRange = 'all') {
  const stats = {
    assignments: {},
    tests: {},
    combined: {}
  };
  
  // Get date range
  const dates = getDateRange(dateRange);
  
  CLASSES.forEach(className => {
    const assignmentScores = [];
    const testScores = [];
    
    dates.forEach(date => {
      const dayData = dailyData[date];
      if (dayData && dayData[studentId]) {
        const assignmentScore = dayData[studentId].assignments[className];
        const testScore = dayData[studentId].tests[className];
        
        // Handle assignments
        if (assignmentScore !== undefined && assignmentScore !== '' && assignmentScore !== null) {
          if (className === 'Spelling') {
            // For spelling, track pass/fail
            assignmentScores.push(assignmentScore);
          } else {
            // For other classes, convert to percentage
            const assignmentPct = pct(assignmentScore, MAX_ASSIGNMENT);
            assignmentScores.push(assignmentPct);
          }
        }
        
        // Handle tests
        if (testScore !== undefined && testScore !== '' && testScore !== null) {
          if (className === 'Spelling') {
            // For spelling, track pass/fail
            testScores.push(testScore);
          } else {
            // For other classes, convert to percentage
            const testPct = pct(testScore, MAX_TEST);
            testScores.push(testPct);
          }
        }
      }
    });
    
    // Calculate statistics
    if (className === 'Spelling') {
      // For spelling, determine overall pass/fail status
      const hasPass = [...assignmentScores, ...testScores].includes('Pass');
      const hasFail = [...assignmentScores, ...testScores].includes('Fail');
      
      stats.combined[className] = {
        status: hasPass ? 'Pass' : (hasFail ? 'Fail' : null),
        totalEntries: assignmentScores.length + testScores.length,
        passCount: [...assignmentScores, ...testScores].filter(s => s === 'Pass').length,
        failCount: [...assignmentScores, ...testScores].filter(s => s === 'Fail').length
      };
    } else {
      // For other classes, calculate averages
      const allScores = [...assignmentScores, ...testScores];
      const assignmentAvg = assignmentScores.length > 0 ? 
        assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length : null;
      const testAvg = testScores.length > 0 ? 
        testScores.reduce((sum, score) => sum + score, 0) / testScores.length : null;
      const overallAvg = allScores.length > 0 ? 
        allScores.reduce((sum, score) => sum + score, 0) / allScores.length : null;
      
      stats.assignments[className] = {
        average: assignmentAvg,
        count: assignmentScores.length,
        scores: assignmentScores
      };
      
      stats.tests[className] = {
        average: testAvg,
        count: testScores.length,
        scores: testScores
      };
      
      stats.combined[className] = {
        average: overallAvg,
        totalCount: allScores.length,
        assignmentCount: assignmentScores.length,
        testCount: testScores.length,
        letterGrade: overallAvg ? letter(overallAvg) : null
      };
    }
  });
  
  return stats;
}

// Get date range based on selection
function getDateRange(range) {
  const today = new Date();
  const dates = Object.keys(dailyData).sort();
  
  switch (range) {
    case 'last7':
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      return dates.filter(date => new Date(date) >= last7);
      
    case 'last30':
      const last30 = new Date(today);
      last30.setDate(today.getDate() - 30);
      return dates.filter(date => new Date(date) >= last30);
      
    case 'custom':
      const startDate = document.getElementById('startDate')?.value;
      const endDate = document.getElementById('endDate')?.value;
      if (startDate && endDate) {
        return dates.filter(date => date >= startDate && date <= endDate);
      }
      return dates;
      
    case 'all':
    default:
      return dates;
  }
}

// Render cumulative table
function renderCumulativeTable() {
  const container = document.getElementById('cumulativeTableContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Create table structure with single header row
  const table = createEl('table');
  const thead = createEl('thead');
  const tbody = createEl('tbody');
  const headerRow = createEl('tr');
  
  // Add single header row with class names
  headerRow.append(createEl('th', {textContent: 'Student'}));
  CLASSES.forEach(className => {
    const th = createEl('th', {textContent: className});
    headerRow.append(th);
  });
  
  thead.append(headerRow);
  table.append(thead, tbody);
  
  // Get active students and render their cumulative data
  const activeStudents = roster.filter(r => r.isActive);
  const dateRange = document.getElementById('dateRangeSelect')?.value || 'all';
  
  activeStudents.forEach(student => {
    const stats = calculateCumulativeStats(student.id, dateRange);
    const tr = createEl('tr');
    
    // Student name
    tr.append(createEl('td', {textContent: student.name}));
    
    // Class statistics
    CLASSES.forEach(className => {
      const td = createEl('td');
      const classStats = stats.combined[className];
      
      if (className === 'Spelling') {
        if (classStats.status) {
          const span = createEl('span', {
            className: `grade-badge ${classStats.status === 'Pass' ? 'pass' : 'warn'}`,
            textContent: classStats.status
          });
          td.append(span);
          
          const statsDiv = createEl('div', {
            className: 'cumulative-stats',
            textContent: `${classStats.passCount}P / ${classStats.failCount}F | ${classStats.totalEntries} total`
          });
          td.append(statsDiv);
        } else {
          td.textContent = '';
        }
      } else {
        if (classStats.average !== null) {
          const span = createEl('span', {
            className: 'grade-badge',
            textContent: `${classStats.average.toFixed(0)}% ${classStats.letterGrade}`
          });
          
          if (classStats.average < 60) {
            span.classList.add('danger');
          } else if (classStats.average < 70) {
            span.classList.add('warn');
          }
          
          td.append(span);
          
          const statsDiv = createEl('div', {
            className: 'cumulative-stats',
            textContent: `${classStats.assignmentCount}A / ${classStats.testCount}T | ${classStats.totalCount} total`
          });
          td.append(statsDiv);
        } else {
          td.textContent = '';
        }
      }
      
      tr.append(td);
    });
    
    tbody.append(tr);
  });
  
  table.append(tbody);
  container.append(table);
}

// Initialize cumulative controls
function initCumulativeControls() {
  const dateRangeSelect = document.getElementById('dateRangeSelect');
  const customDateRange = document.getElementById('customDateRange');
  const refreshBtn = document.getElementById('refreshCumulativeBtn');
  
  // Handle date range selection
  dateRangeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customDateRange.style.display = 'flex';
      // Set default dates
      const today = todayStr();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      document.getElementById('startDate').value = lastMonth.toISOString().slice(0, 10);
      document.getElementById('endDate').value = today;
    } else {
      customDateRange.style.display = 'none';
    }
    renderCumulativeTable();
  });
  
  // Handle custom date changes
  document.getElementById('startDate')?.addEventListener('change', renderCumulativeTable);
  document.getElementById('endDate')?.addEventListener('change', renderCumulativeTable);
  
  // Handle refresh button
  refreshBtn?.addEventListener('click', renderCumulativeTable);
}

// Debug function to check localStorage data
function debugLocalStorage() {
  console.log('=== DEBUGGING LOCALSTORAGE DATA ===');
  
  // Check all possible storage keys
  const allKeys = [
    'best-grader-v1', // old key
    'best-grader-roster-v2',
    'best-grader-daily-data-v2',
    'best-grader-current-date-v2',
    'best-grader-student-profiles-v2',
    'best-grader-settings-v2'
  ];
  
  allKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      console.log(`${key}:`, JSON.parse(data));
    } else {
      console.log(`${key}: (empty)`);
    }
  });
  
  // Check current state
  console.log('Current roster:', roster);
  console.log('Current dailyData:', dailyData);
  console.log('Current students:', students);
  console.log('Current date:', currentDate);
}

// Make debug function available globally
window.debugLocalStorage = debugLocalStorage;
