import handler from '../dist/index.js';

// 빌드된 dist/index.js에서 default export된 핸들러를 가져와
// Vercel 서버리스 함수로 다시 export 합니다.
export default handler; 