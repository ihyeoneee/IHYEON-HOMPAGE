const XLSX = require('./node_modules/xlsx');
const fs = require('fs');
const wb = XLSX.readFile('합본.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

const scoreMap = {
  '매우 그렇다.': 5, '매우 그렇다': 5,
  '그렇다.': 4, '그렇다': 4,
  '보통이다.': 3, '보통이다': 3,
  '그렇지 않다.': 2, '그렇지 않다': 2,
  '매우 그렇지 않다.': 1, '매우 그렇지 않다': 1
};

function getStage(career) {
  const n = parseFloat(String(career).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return null;
  if (n < 5) return '입직기';
  if (n < 15) return '성장기';
  if (n < 25) return '발전기';
  return '심화기';
}

const subCompetencies = [
  { id: 1, name: 'AI·디지털 관련 기초 지식 이해 역량', domain: 'understanding', items: [0,1,2] },
  { id: 2, name: 'AI·디지털의 사회적 영향력 이해 역량', domain: 'understanding', items: [3,4,5] },
  { id: 3, name: 'AI·디지털의 교육영역에서의 활용 이해 역량', domain: 'understanding', items: [6,7,8] },
  { id: 4, name: 'AI 디지털 윤리 실천 이해 역량', domain: 'understanding', items: [9,10,11] },
  { id: 5, name: 'AI·디지털 기반 교육과정 재구성 역량', domain: 'application', items: [12,13,14] },
  { id: 6, name: 'AI·디지털 기반 개별화 학습 설계 역량', domain: 'application', items: [15,16,17] },
  { id: 7, name: 'AI·디지털 기반 평가 설계 역량', domain: 'application', items: [18,19,20] },
  { id: 8, name: 'AI·디지털 기술·평가, 선정 또는 개발 역량', domain: 'application', items: [21,22,23] },
  { id: 9, name: 'AI·디지털 기반 교수-학습 매체 활용 역량', domain: 'application', items: [24,25,26] },
  { id: 10, name: 'AI·디지털 기반 기술적 문제 진단 역량', domain: 'application', items: [27,28,29] },
  { id: 11, name: 'AI·디지털 의사소통 및 데이터 활용 역량', domain: 'application', items: [30,31,32] },
  { id: 12, name: '평가 데이터 해석 및 활용 역량', domain: 'application', items: [33,34,35] },
  { id: 13, name: '데이터 활용 피드백 역량', domain: 'application', items: [36,37,38] },
  { id: 14, name: 'AI·디지털 활용을 위한 수업성찰 역량', domain: 'professional', items: [39,40,41] },
  { id: 15, name: 'AI·디지털 관련 저작권 보호 역량', domain: 'professional', items: [42,43,44] },
];

const stageData = { '입직기': [], '성장기': [], '발전기': [], '심화기': [], '전체': [] };

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const stage = getStage(row[2]);
  if (!stage) continue;
  const scores = [];
  for (let j = 10; j <= 54; j++) {
    const s = scoreMap[row[j]];
    if (s !== undefined) scores.push(s);
  }
  if (scores.length === 45) {
    stageData[stage].push(scores);
    stageData['전체'].push(scores);
  }
}

function avg(arr) { return arr.length ? parseFloat((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(3)) : 0; }
function std(arr) {
  if (!arr.length) return 0;
  const m = arr.reduce((a,b)=>a+b,0)/arr.length;
  return parseFloat(Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length).toFixed(3));
}

const result = { meta: { stageLabels: ['입직기','성장기','발전기','심화기'], stageCriteria: ['5년 미만','5~15년','15~25년','25년 이상'] }, stages: {} };

Object.keys(stageData).forEach(stage => {
  const rows = stageData[stage];
  result.stages[stage] = { n: rows.length, subCompetencies: {}, domains: {} };

  subCompetencies.forEach(sc => {
    const vals = rows.map(row => sc.items.map(i=>row[i]).reduce((a,b)=>a+b,0)/sc.items.length);
    result.stages[stage].subCompetencies[sc.id] = { avg: avg(vals), std: std(vals), name: sc.name, domain: sc.domain };
  });

  // 3개 상위역량 평균
  ['understanding','application','professional'].forEach(domain => {
    const scs = subCompetencies.filter(s=>s.domain===domain);
    const vals = rows.map(row => {
      const allItems = scs.flatMap(sc=>sc.items);
      return allItems.map(i=>row[i]).reduce((a,b)=>a+b,0)/allItems.length;
    });
    result.stages[stage].domains[domain] = { avg: avg(vals), std: std(vals) };
  });
});

fs.writeFileSync('benchmark_data.json', JSON.stringify(result, null, 2));
console.log('완료! benchmark_data.json 생성됨');
console.log('\n=== 생애주기별 응답자 수 ===');
Object.entries(result.stages).forEach(([k,v]) => console.log(k + ': ' + v.n + '명'));
console.log('\n=== 전체 집단 하위역량 평균 ===');
Object.entries(result.stages['전체'].subCompetencies).forEach(([id,v]) => {
  console.log('역량' + id + ': ' + v.avg + ' (' + v.name.substring(0,15) + '...)');
});
