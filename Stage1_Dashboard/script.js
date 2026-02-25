
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW failed', err));
    });
}



// --- 1. LOCALIZATION DATA ---
const langData = {
    en: {
        emergency: "Emergency (140)", title: "NEURIVA", subtitle: "Your Daily Health & Wellness Metrics",
        mode_daily: "Daily Journal", mode_monthly: "Monthly Trends", 
        show_hist: "Show Histograms", show_curves: "Show Curves",
        chart_ecg: "ECG Flow (ms/mV)", chart_hrt: "Heart Rhythm (BPM)",
        contact_header: "Share with Doctor", symptoms: "How are you feeling today?", meds: "Did you take any medication?",
        comments: "Any other notes?", method: "Select Contact Method:",
        remember: "Save doctor's contact for next time", send: "Generate & Send Report",
        modal_title: "Your Profile", modal_save: "Save Changes", modal_cancel: "Close",
        ph_name: "First Name", ph_age: "Age", ph_med: "e.g., Aspirin, Vitamins", ph_notes: "I slept really well last night...",
        ph_sex: "Select Sex", sex_m: "Male", sex_f: "Female", ph_email: "Doctor's Email", ph_phone: "Doctor's Mobile",
        sym_list: ["Dizzy", "Chest Pain", "Short Breath", "Palpitations", "Fatigued", "Nauseous"],
        weeks: ["Week 1", "Week 2", "Week 3", "Week 4"],
        chart_labels: ["0 Mins (Bar)", "30 Mins (Bar)", "0 Mins (Curve)", "30 Mins (Curve)"],
        greet_morn: "Good morning", greet_aft: "Good afternoon", greet_eve: "Good evening", welcome: "Welcome back"
    },
    ar: {
        emergency: "طوارئ (140)", title: "نيوريفا", subtitle: "مؤشرات الصحة والعافية اليومية",
        mode_daily: "يومياتي", mode_monthly: "اتجاهات الشهر", 
        show_hist: "إظهار الأعمدة", show_curves: "إظهار المنحنيات",
        chart_ecg: "تدفق تخطيط القلب (ms/mV)", chart_hrt: "إيقاع القلب (BPM)",
        contact_header: "مشاركة مع الطبيب", symptoms: "كيف تشعر اليوم؟", meds: "هل تناولت أي أدوية؟",
        comments: "ملاحظات إضافية؟", method: "اختر وسيلة الاتصال:",
        remember: "حفظ بيانات الطبيب للمرة القادمة", send: "توليد وإرسال التقرير",
        modal_title: "ملفك الشخصي", modal_save: "حفظ التغييرات", modal_cancel: "إغلاق",
        ph_name: "الاسم الأول", ph_age: "العمر", ph_med: "مثلاً: أسبرين، فيتامينات", ph_notes: "نمت بشكل جيد الليلة الماضية...",
        ph_sex: "اختر الجنس", sex_m: "ذكر", sex_f: "أنثى", ph_email: "بريد الطبيب", ph_phone: "رقم الطبيب",
        sym_list: ["دوار", "ألم صدر", "ضيق تنفس", "خفقان", "تعب", "غثيان"],
        weeks: ["الأسبوع 1", "الأسبوع 2", "الأسبوع 3", "الأسبوع 4"],
        chart_labels: ["0 دقيقة (عامود)", "30 دقيقة (عامود)", "0 دقيقة (منحنى)", "30 دقيقة (منحنى)"],
        greet_morn: "صباح الخير", greet_aft: "طاب مساؤك", greet_eve: "مساء الخير", welcome: "أهلاً بك"
    }
};

// --- 2. STATE ---
let currentLang = 'en';
let currentViewMode = 'daily'; 
let currentViewLabel = ""; 
let isDarkMode = false;
let currentMethod = null;
const savedTheme = localStorage.getItem('darkMode') === 'true';

if (savedTheme) {
    isDarkMode = true;
    document.body.classList.add('dark-mode');
}

// --- CUSTOM TOAST NOTIFICATION ---
function showToast(message, isError = false) {
    const toast = document.getElementById('toastMessage');
    toast.innerText = message;
    if(isError) toast.classList.add('error');
    else toast.classList.remove('error');
    
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}


// --- GREETING LOGIC ---
function updateGreeting() {
    const hour = new Date().getHours();
    let name = localStorage.getItem('patientName') || "";
    if(name) name = name.split(' ')[0]; // Use first name for friendliness
    
    let timeGreet = "";
    const dict = langData[currentLang];
    
    // 1. Determine the time of day
    if(hour < 12) timeGreet = dict.greet_morn;
    else if(hour < 18) timeGreet = dict.greet_aft;
    else timeGreet = dict.greet_eve;

    // 2. Check if user has a profile. If yes, add ", Name". If not, just use the time greeting!
    const finalGreet = name ? `${timeGreet}, ${name}! 👋` : `${timeGreet}! 👋`;
    
    document.getElementById('greetingText').innerText = finalGreet;
}

// --- 3. PROFILE LOGIC ---
function openProfile() { document.getElementById('profileModal').style.display = 'flex'; }
function closeProfile() { document.getElementById('profileModal').style.display = 'none'; }

function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const ageValue = document.getElementById('profileAge').value;
    const sex = document.getElementById('profileSex').value;
    const age = parseInt(ageValue, 10);

    if (!name || !ageValue || !sex) {
        showToast(currentLang === 'en' ? "Please complete all fields. 😅" : "يرجى تعبئة جميع الحقول. 😅", true);
        return;
    }
    if (isNaN(age) || age < 0 || age > 120) {
        showToast(currentLang === 'en' ? "Please enter a valid age." : "يرجى إدخال عمر صحيح.", true);
        return;
    }

    localStorage.setItem('patientName', name);
    localStorage.setItem('patientAge', age);
    localStorage.setItem('patientSex', sex);

    closeProfile();
    showToast(currentLang === 'en' ? "Profile Saved Successfully! ✨" : "تم حفظ الملف بنجاح! ✨");
    updateGreeting(); // Update name immediately
}

function loadProfile() {
    const name = localStorage.getItem('patientName');
    const age = localStorage.getItem('patientAge');
    const sex = localStorage.getItem('patientSex'); 
    
    if(name) document.getElementById('profileName').value = name;
    if(age) document.getElementById('profileAge').value = age;
    if(sex) document.getElementById('profileSex').value = sex; 
}

// --- 4. LANGUAGE LOGIC ---
function toggleLang() {
    currentLang = (currentLang === 'en') ? 'ar' : 'en';
    if(currentLang === 'ar') document.body.classList.add('rtl');
    else document.body.classList.remove('rtl');

    document.getElementById('btn_lang').innerText = (currentLang === 'en') ? 'عربي' : 'English';
    const data = langData[currentLang];
    
    const mapping = {
        'txt_emergency': data.emergency, 'txt_title': data.title, 'txt_subtitle': data.subtitle,
        'txt_mode_daily': data.mode_daily, 'txt_mode_monthly': data.mode_monthly, 
        'txt_show_hist': data.show_hist, 'txt_show_curves': data.show_curves,
        'txt_chart_ecg': data.chart_ecg, 'txt_chart_hrt': data.chart_hrt, 'txt_contact_header': data.contact_header,
        'txt_symptoms': data.symptoms, 'txt_meds': data.meds, 'txt_comments': data.comments,
        'txt_method': data.method, 'txt_remember': data.remember, 'txt_send': data.send,
        'txt_modal_title': data.modal_title, 'txt_modal_save': data.modal_save, 'txt_modal_cancel': data.modal_cancel
    };
    for (const [id, text] of Object.entries(mapping)) {
        if(document.getElementById(id)) document.getElementById(id).innerText = text;
    }

    document.getElementById('profileName').placeholder = data.ph_name;
    document.getElementById('profileAge').placeholder = data.ph_age;
    document.getElementById('medInput').placeholder = data.ph_med;
    document.getElementById('patientComment').placeholder = data.ph_notes;
    document.getElementById('inputEmail').placeholder = data.ph_email;
    document.getElementById('inputPhone').placeholder = data.ph_phone;
    document.getElementById('txt_sel_sex').innerText = data.ph_sex;
    document.getElementById('txt_sex_m').innerText = data.sex_m;
    document.getElementById('txt_sex_f').innerText = data.sex_f;

    const symLabels = document.querySelectorAll('.lbl-sym');
    symLabels.forEach((lbl, index) => { lbl.innerText = data.sym_list[index]; });

    updateGreeting();
    if(currentViewMode === 'monthly') setMonthlyView(); else handleDateChange();
}

// --- 5. THEME LOGIC ---
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    document.querySelector('.theme-toggle').textContent = isDarkMode ? '☀️' : '🌙';
    if (ecgChartInstance) updateChartTheme(ecgChartInstance);
    if (hrtChartInstance) updateChartTheme(hrtChartInstance);
    localStorage.setItem('darkMode', isDarkMode);
}

function updateChartTheme(chart) {
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDarkMode ? '#bcaedb' : '#6b5c7a';

    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = tickColor;
    chart.options.scales.y.ticks.color = tickColor;
    chart.options.plugins.legend.labels.color = tickColor;

    if (isDarkMode) {
        chart.data.datasets[2].borderColor = '#d383f8';
        chart.data.datasets[2].backgroundColor = '#d383f8';
        chart.data.datasets[3].borderColor = '#f1b6ff';
        chart.data.datasets[3].backgroundColor = '#f1b6ff';
    } else {
        chart.data.datasets[2].borderColor = '#842dcb';
        chart.data.datasets[2].backgroundColor = '#842dcb';
        chart.data.datasets[3].borderColor = '#7c2cc4';
        chart.data.datasets[3].backgroundColor = '#7c2cc4';
    }
    chart.update();
}

// --- 6. DATA & CHARTS ---
function getPseudoRandomData(seedString) {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) hash = ((hash << 5) - hash) + seedString.charCodeAt(i) | 0;
    const absHash = Math.abs(hash);
    return { ecg: [ 70 + (absHash % 20), 65 + (absHash % 15) ], hrt: [ 60 + (absHash % 30), 60 + ((absHash * 2) % 25) ] };
}

function handleDateChange() {
    const datePicker = document.getElementById('datePicker');
    if(!datePicker.value) return;
    currentViewMode = 'daily';
    currentViewLabel = datePicker.value;
    document.getElementById('viewModeSelect').value = 'daily';
    document.getElementById('controlsPanel').style.display = 'none';

    const data = getPseudoRandomData(datePicker.value);
    updateSingleChart(ecgChartInstance, [currentViewLabel], [data.ecg[0]], [data.ecg[1]], [], []);
    updateSingleChart(hrtChartInstance, [currentViewLabel], [data.hrt[0]], [data.hrt[1]], [], []);
}

function toggleViewMode() {
    const mode = document.getElementById('viewModeSelect').value;
    const datePicker = document.getElementById('datePicker');
    const monthPicker = document.getElementById('monthPicker');
    const controls = document.getElementById('controlsPanel');

    if (mode === 'daily') {
        datePicker.style.display = 'inline-block';
        monthPicker.style.display = 'none';
        controls.style.display = 'none';
        handleDateChange(); 
    } else {
        datePicker.style.display = 'none';
        monthPicker.style.display = 'inline-block';
        controls.style.display = 'block';
        if (!monthPicker.value) {
            const now = new Date();
            monthPicker.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        setMonthlyView(); 
    }
}

function setMonthlyView() {
    currentViewMode = 'monthly';
    const monthVal = document.getElementById('monthPicker').value; 
    if(!monthVal) return;

    const dateObj = new Date(monthVal + "-01");
    const options = { month: 'long', year: 'numeric' };
    currentViewLabel = dateObj.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG', options);

    const labels = langData[currentLang].weeks;
    let ecg0=[], ecg30=[], hrt0=[], hrt30=[];

    for (let w = 0; w < 4; w++) {
        let sE0=0, sE30=0, sH0=0, sH30=0;
        for (let d = 0; d < 7; d++) {
            let daily = getPseudoRandomData(`${monthVal}-${(w * 7) + d + 1}`);
            sE0+=daily.ecg[0]; sE30+=daily.ecg[1]; sH0+=daily.hrt[0]; sH30+=daily.hrt[1];
        }
        ecg0.push(Math.round(sE0/7)); ecg30.push(Math.round(sE30/7));
        hrt0.push(Math.round(sH0/7)); hrt30.push(Math.round(sH30/7));
    }
    updateSingleChart(ecgChartInstance, labels, ecg0, ecg30, ecg0, ecg30);
    updateSingleChart(hrtChartInstance, labels, hrt0, hrt30, hrt0, hrt30);
}

let ecgChartInstance = null, hrtChartInstance = null;

function createChart(canvasId, colorB, colorA, colorLB, colorLA) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        plugins: [{
            id: 'align', beforeDatasetsDraw(c) {
                const pairs=[[0,2],[1,3]];
                pairs.forEach(([bI,lI])=>{
                    const bM=c.getDatasetMeta(bI), lM=c.getDatasetMeta(lI);
                    if(!bM.hidden && !lM.hidden && bM.data.length===lM.data.length)
                        lM.data.forEach((p,i)=>{ if(bM.data[i]) p.x=bM.data[i].x; });
                });
            }
        }],
        data: {
            labels: [],
            datasets: [
                { type: 'bar', data: [], backgroundColor: colorB, borderRadius:8, order:3, barPercentage:0.6 },
                { type: 'bar', data: [], backgroundColor: colorA, borderRadius:8, order:3, barPercentage:0.6 },
                /* Nuance: tension: 0.4 creates beautiful, smooth, friendly curves instead of harsh spikes */
                { type: 'line', data: [], borderColor: colorLB, backgroundColor:colorLB, borderWidth:4, pointRadius:5, order:1, tension: 0.4 },
                { type: 'line', data: [], borderColor: colorLA, backgroundColor:colorLA, borderDash: [6,4], borderWidth:4, pointRadius:5, order:1, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            /* Nuance: Fluid rendering animation */
            animation: { duration: 1200, easing: 'easeOutQuart' },
            scales: { 
                y: { beginAtZero:true, grid:{color:'rgba(0,0,0,0.05)'} }, 
                x: { offset:true, grid:{display:false} } 
            },
            plugins: { 
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, filter: (l, d) => d.datasets[l.datasetIndex].type!=='line'||d.datasets[l.datasetIndex].data.length>0 } } 
            }
        }
    });
}

ecgChartInstance = createChart('ecgChart', 'rgba(220, 140, 251, 0.4)', 'rgba(211, 131, 248, 0.8)', '#842dcb', '#7c2cc4');
hrtChartInstance = createChart('hrtChart', 'rgba(124, 44, 196, 0.4)', 'rgba(132, 45, 203, 0.8)', '#401883', '#2d0f5c');

function updateSingleChart(chart, labels, b0, b30, l0, l30) {
    chart.data.labels = labels;
    const leg = langData[currentLang].chart_labels;
    chart.data.datasets[0].label = leg[0]; chart.data.datasets[1].label = leg[1];
    chart.data.datasets[2].label = leg[2]; chart.data.datasets[3].label = leg[3];

    chart.data.datasets[0].data = b0; chart.data.datasets[1].data = b30;
    chart.data.datasets[2].data = l0; chart.data.datasets[3].data = l30;
    
    if(l0.length===0) {
        chart.getDatasetMeta(0).hidden=false; chart.getDatasetMeta(1).hidden=false;
        chart.getDatasetMeta(2).hidden=true; chart.getDatasetMeta(3).hidden=true;
    } else toggleLayers();
    chart.update();
}

function toggleLayers() {
    if(currentViewMode!=='monthly') return;
    const bars = document.getElementById('toggleBars').checked;
    const curves = document.getElementById('toggleCurves').checked;
    [ecgChartInstance, hrtChartInstance].forEach(c => {
        c.getDatasetMeta(0).hidden = !bars; c.getDatasetMeta(1).hidden = !bars;
        c.getDatasetMeta(2).hidden = !curves; c.getDatasetMeta(3).hidden = !curves;
        c.update();
    });
}

// --- 7. CONTACT & SEND ---
function selectMethod(m, btn) {
    currentMethod = m;
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const em = document.getElementById('inputEmail'), ph = document.getElementById('inputPhone');
    if(m==='gmail') { em.classList.add('visible'); ph.classList.remove('visible'); if(!em.value) em.focus(); }
    else { em.classList.remove('visible'); ph.classList.add('visible'); if(!ph.value) ph.focus(); }
    validateInput();
}

function validateInput() {
    const check = document.getElementById('checkMark'), btn = document.getElementById('sendBtn');
    let valid = false;
    if(currentMethod==='gmail') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(document.getElementById('inputEmail').value.trim());
    else if(currentMethod==='whatsapp') valid = /^(?:\+?961|0)?(3|70|71|76|78|79|81)\d{6}$/.test(document.getElementById('inputPhone').value.replace(/\s+/g,''));
    
    check.style.display = valid ? 'block' : 'none';
    btn.disabled = !valid;
}

function sendReport() {
    if (!currentMethod) {
        showToast(currentLang === 'en' ? "Please select a contact method.📱" : "يرجى اختيار وسيلة الاتصال.📱", true);
        return;
    }
    if (!currentViewLabel) {
        showToast(currentLang === 'en' ? "Please select a date first." : "يرجى اختيار التاريخ أولاً.", true);
        return;
    }

    const pName = localStorage.getItem('patientName') || "Unknown Patient";
    const pAge = localStorage.getItem('patientAge') || "?";

    const now = new Date();
    const year = now.getFullYear().toString().substr(-2); 
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); 
    const day = now.getDate().toString().padStart(2, '0'); 
    const reportId = `${year}${month}${day}-${pName.substring(0,2).toUpperCase() || "XX"}-${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('generatedReportId', reportId);

    const comment = document.getElementById('patientComment').value;
    const med = document.getElementById('medInput').value || "None";
    
    let syms = [];
    document.querySelectorAll('input[name="symptom"]:checked').forEach(cb => { syms.push(cb.parentElement.querySelector('span').innerText); });
    
    localStorage.setItem('patientSymptoms', syms.length ? syms.join(', ') : "None");
    localStorage.setItem('patientMeds', med);
    localStorage.setItem('patientNotes', comment);
    
    let repDate = currentViewMode === 'daily' ? document.getElementById('datePicker').value : currentViewLabel;
    localStorage.setItem('reportDate', repDate);
    localStorage.setItem('reportMode', currentViewMode);
    localStorage.setItem('ecgData', JSON.stringify(ecgChartInstance.data));
    localStorage.setItem('hrtData', JSON.stringify(hrtChartInstance.data));

    if(document.getElementById('rememberMe').checked) {
        localStorage.setItem('docEmail', document.getElementById('inputEmail').value);
        localStorage.setItem('docPhone', document.getElementById('inputPhone').value);
    } else {
        localStorage.removeItem('docEmail'); localStorage.removeItem('docPhone');
    }

const msg = `Hello Doctor,\n\nPlease find my latest Health Report attached for ${repDate}.\nReport Ref ID: ${reportId}\n\n*Note: I will attach the PDF document to this message shortly.*\n\nRegards,\n${pName}`;
    let appUrl = currentMethod === 'gmail' 
        ? `mailto:${document.getElementById('inputEmail').value}?subject=${encodeURIComponent("Patient Health Report - " + pName)}&body=${encodeURIComponent(msg)}`
        : `https://wa.me/${document.getElementById('inputPhone').value.replace(/\D/g,'').replace(/^0/, '961')}?text=${encodeURIComponent(msg)}`;

    // 1. Open the PDF Generation in a new tab
    window.open("../Stage2_Clinical_Report/neuriva_report.html", "_blank");

    // 2. DO NOT REDIRECT AUTOMATICALLY. Change the button so the user is in control!
    const btn = document.getElementById('sendBtn');
    const platformName = currentMethod === 'gmail' ? 'Email' : 'WhatsApp';
    const platformNameAr = currentMethod === 'gmail' ? 'الإيميل' : 'واتساب';
    
    btn.innerHTML = currentLang === 'en' ? `Step 2: Open ${platformName} ➔` : `الخطوة 2: فتح ${platformNameAr} ➔`;
    btn.style.backgroundColor = "#27ae60"; // Turn it green to show it's a new step!

    // 3. Change what the button does when clicked a second time
    btn.onclick = function() {
        window.location.href = appUrl; // Now it opens WhatsApp/Gmail
        
        // Reset the button back to normal after a few seconds
        setTimeout(() => {
            btn.innerHTML = currentLang === 'en' ? "Generate & Send Report" : "توليد وإرسال التقرير";
            btn.style.backgroundColor = "var(--primary)";
            btn.onclick = sendReport;
        }, 3000);
    };

    // Show a helpful hint!
    showToast(currentLang === 'en' ? "PDF opened! Save it, then click Step 2." : "تم فتح التقرير! احفظه ثم اضغط الخطوة 2.");
}

window.onload = function() {
    document.getElementById('datePicker').value = new Date().toISOString().split('T')[0];
    handleDateChange();
    loadProfile();
    updateGreeting();
    const sE=localStorage.getItem('docEmail'), sP=localStorage.getItem('docPhone');
    if(sE) document.getElementById('inputEmail').value=sE;
    if(sP) document.getElementById('inputPhone').value=sP;
    document.querySelector('.theme-toggle').textContent = isDarkMode ? '☀️' : '🌙';
    if (isDarkMode) { updateChartTheme(ecgChartInstance); updateChartTheme(hrtChartInstance); };
};


