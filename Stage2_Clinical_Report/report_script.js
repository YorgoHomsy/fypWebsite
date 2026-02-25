
// --- 1. SETUP & DATA EXTRACTION ---
document.getElementById('reportID').innerText = localStorage.getItem('generatedReportId') || ("RPT-" + Math.floor(100000 + Math.random() * 900000));  
document.getElementById('printDate').innerText = new Date().toLocaleString();

const pName = localStorage.getItem('patientName') || "Unknown Patient";
const pAge = localStorage.getItem('patientAge') || "--";
const pSex = localStorage.getItem('patientSex') || "--";
const pSymptoms = localStorage.getItem('patientSymptoms') || "";
const pMeds = localStorage.getItem('patientMeds') || "None";
const pNotes = localStorage.getItem('patientNotes') || "No comments.";
const rDate = localStorage.getItem('reportDate') || new Date().toLocaleDateString();
const rMode = localStorage.getItem('reportMode');

document.getElementById('ptName').innerText = pName;
document.getElementById('ptAge').innerText = pAge;
document.getElementById('ptSex').innerText = pSex;

document.getElementById('valMeds').innerText = pMeds;
document.getElementById('ptNotes').innerText = pNotes;

if (rMode === 'daily') {
    const d = new Date(rDate);
    document.getElementById('recordDate').innerText = isNaN(d.getTime()) ? rDate : d.toLocaleDateString();
} else {
    document.getElementById('recordDate').innerText = rDate || "Monthly Report";
    const badge = document.getElementById('reportTypeBadge');
    badge.innerText = "MONTHLY OVERVIEW";
    badge.style.backgroundColor = "#6c5ce7";
}

// --- 2. INTELLIGENT SYMPTOM DISPLAY ---
const criticalSymptoms = ["Chest Pain", "Shortness of Breath", "Palpitations", "ألم في الصدر", "ضيق في التنفس", "Dizziness", "دوخة"];
const symContainer = document.getElementById('symptomContainer');

if(pSymptoms === "None" || pSymptoms === "") {
    symContainer.innerHTML = "<span class='symptom-tag'>Asymptomatic</span>";
} else {
    const symList = pSymptoms.split(', ');
    symList.forEach(sym => {
        const span = document.createElement('span');
        span.className = 'symptom-tag';
        span.innerText = sym;
        if(criticalSymptoms.includes(sym)) {
            span.classList.add('critical');
        }
        symContainer.appendChild(span);
    });
}

// --- 3. CHART STATS CALCULATION ---
const ecgRaw = JSON.parse(localStorage.getItem('ecgData'));
const hrtRaw = JSON.parse(localStorage.getItem('hrtData'));

function calculateStats(chartData) {
    let allValues = [];
    chartData.datasets.forEach(ds => {
        ds.data.forEach(val => {
            if(val !== null && val !== undefined && !isNaN(val)) allValues.push(Number(val));
        });
    });

    if(allValues.length === 0) return { avg: 0, max: 0 };
    const max = Math.max(...allValues);
    const sum = allValues.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / allValues.length);
    return { avg, max };
}

if(hrtRaw) {
    const hrtStats = calculateStats(hrtRaw);
    document.getElementById('valAvgHrt').innerText = hrtStats.avg;
    document.getElementById('valMaxHrt').innerText = hrtStats.max;

    if(hrtStats.max > 100) {
        document.getElementById('boxMaxHrt').classList.add('alert');
    } else {
        document.getElementById('boxMaxHrt').style.borderLeftColor = "#27ae60"; 
    }
}

if(ecgRaw) {
    const ecgStats = calculateStats(ecgRaw);
    document.getElementById('valAvgEcg').innerText = ecgStats.avg;
}


// --- 4. RENDER CLINICAL CHARTS ---
const whiteBgPlugin = {
    id: 'whiteBg',
    beforeDraw: (chart) => {
        const ctx = chart.canvas.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    }
};

const alignPlugin = {
    id: 'align',
    beforeDatasetsDraw(c) {
        const pairs=[[0,2],[1,3]];
        pairs.forEach(([bI,lI])=>{
            const bM=c.getDatasetMeta(bI), lM=c.getDatasetMeta(lI);
            if(c.data.datasets[bI] && c.data.datasets[lI] && !bM.hidden && !lM.hidden && bM.data.length===lM.data.length)
                lM.data.forEach((p,i)=>{ if(bM.data[i]) p.x=bM.data[i].x; });
        });
    }
};

const barLabelPlugin = {
    id: 'barLabelPlugin',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden || dataset.type !== 'bar') return;

            ctx.save();
            ctx.font = 'bold 11px "Segoe UI", sans-serif'; 
            ctx.fillStyle = '#333333'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value !== null && value !== undefined) {
                    ctx.fillText(value, bar.x, bar.y - 4);
                }
            });
            ctx.restore();
        });
    }
};

const commonOptions = {
    responsive: false,
    animation: false,
    maintainAspectRatio: false,
    devicePixelRatio: 2, 
    plugins: {
        legend: { 
            position: 'bottom',
            labels: { 
                boxWidth: 10, 
                usePointStyle: true, 
                font: { size: 10, family: 'Segoe UI' },
                // FIX: This filter hides the line legend if the line dataset is empty (Daily view)
                filter: (l, d) => d.datasets[l.datasetIndex].type !== 'line' || d.datasets[l.datasetIndex].data.length > 0
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            suggestedMax: (ctx) => {
                const max = Math.max(...[].concat(...ctx.chart.data.datasets.map(d => d.data)));
                return max * 1.15;
            },
            grid: { color: '#f0f0f0' }, 
            ticks: { font: { size: 9 }, color: '#7f8c8d' }
        },
        x: {
            grid: { display: false },
            ticks: { font: { size: 9 }, color: '#7f8c8d' }
        }
    }
};

if(ecgRaw) {
    ecgRaw.datasets[0].backgroundColor = "rgba(220, 53, 69, 0.7)"; 
    ecgRaw.datasets[1].backgroundColor = "rgba(108, 117, 125, 0.3)"; 
    if(ecgRaw.datasets[2]) ecgRaw.datasets[2].borderColor = "#c0392b";
    if(ecgRaw.datasets[3]) ecgRaw.datasets[3].borderColor = "#343a40";
    
    new Chart(document.getElementById('ecgPdfChart'), {
        data: ecgRaw,
        plugins: [whiteBgPlugin, alignPlugin, barLabelPlugin],
        options: commonOptions
    });
}

if(hrtRaw) {
    hrtRaw.datasets[0].backgroundColor = "rgba(0, 77, 153, 0.7)"; 
    hrtRaw.datasets[1].backgroundColor = "rgba(108, 117, 125, 0.3)";
    if(hrtRaw.datasets[2]) hrtRaw.datasets[2].borderColor = "#004085"; 
    if(hrtRaw.datasets[3]) hrtRaw.datasets[3].borderColor = "#343a40";

    new Chart(document.getElementById('hrtPdfChart'), {
        data: hrtRaw,
        plugins: [whiteBgPlugin, alignPlugin, barLabelPlugin],
        options: commonOptions
    });
}

// --- 5. PDF AUTO-GENERATION ---
window.onload = function() {
    setTimeout(() => generatePdf(), 1000);
};

function convertChartsToImages() {
    const canvases = document.querySelectorAll('canvas');
    const replacements = [];

    canvases.forEach(canvas => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL("image/jpeg", 1.0);
        img.style.width = "100%";
        img.classList.add("avoid-break");

        canvas.style.display = "none";
        canvas.parentNode.insertBefore(img, canvas);

        replacements.push({ canvas, img });
    });
    return replacements;
}

function restoreCharts(replacements) {
    replacements.forEach(obj => {
        obj.img.remove();
        obj.canvas.style.display = "block";
    });
}

function generatePdf() {
    const replacements = convertChartsToImages();
    
    // 1. Get the Date
    const sDate = localStorage.getItem('reportDate') || "Report";
    const safeDate = sDate.replace(/[^a-z0-9]/gi, '_'); 
    
    // 2. Get Patient Name (Replace spaces with underscores for safe filenames)
    let pNameRaw = localStorage.getItem('patientName') || "Patient";
    const safeName = pNameRaw.replace(/\s+/g, '_');
    
    // 3. Get Report Type (Daily vs Monthly)
    const rMode = localStorage.getItem('reportMode') === 'monthly' ? 'Monthly' : 'Daily';

    // 4. Construct the Smart Clinical Filename
    // Example: NEURIVA_Daily_Yorgo_El_Homsi_2026_02_25.pdf
    const finalFileName = `NEURIVA_${rMode}_${safeName}_${safeDate}.pdf`;

    const opt = {
        margin: [0, 0, 0, 0], 
        filename: finalFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2, 
            useCORS: true,
            scrollY: 0
        },
        jsPDF: {
            unit: 'pt',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: {
            mode: ['css'],
            avoid: '.avoid-break'
        }
    };

    html2pdf()
        .set(opt)
        .from(document.getElementById('a4Page'))
        .save()
        .then(() => {
            restoreCharts(replacements);
             
        });
}

