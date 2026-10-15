// 진입점: 저장 칸을 맞추고, 일반 계정이면 서버 저장을 받아 온 뒤에 게임을 시작한다 (cloud.js)
import { syncSlot, cloudBoot } from './cloud.js';

if (!syncSlot()) cloudBoot().then(() => import('./app.js'));
