import { state } from './state.js';

// 영단어 (단계별·주제별). 뜻만 보고 영어를 써야 하니까 모든 단계에서 뜻이 겹치지 않게 골랐다
// 뽑기 기계 레벨 = 단어 단계. 기계를 업그레이드할 때마다 더 어려운 단어가 나온다
export const TIERS = ['기초', '초등', '중1', '중2', '중3'];
// 단계별로 한 문제 맞힐 때 받는 코인
export const TIER_COINS = [1, 1, 2, 2, 3];
const T1 = {
  '동물': 'cat:고양이|dog:개|bird:새|fish:물고기|horse:말|cow:소|pig:돼지|rabbit:토끼|tiger:호랑이|lion:사자|bear:곰|monkey:원숭이|duck:오리|frog:개구리|mouse:쥐|sheep:양|snake:뱀|chicken:닭',
  '음식': 'apple:사과|grape:포도|milk:우유|bread:빵|egg:달걀|water:물|rice:밥|candy:사탕|carrot:당근|potato:감자|onion:양파|meat:고기',
  '몸': 'eye:눈|nose:코|mouth:입|ear:귀|hand:손|foot:발|head:머리|leg:다리|arm:팔|face:얼굴|tooth:이빨',
  '색깔': 'red:빨간색|blue:파란색|yellow:노란색|green:초록색|black:검은색|white:흰색|pink:분홍색|brown:갈색',
  '숫자': 'one:하나|two:둘|three:셋|four:넷|five:다섯|six:여섯|seven:일곱|eight:여덟|nine:아홉|ten:열',
  '사람': 'mother:엄마|father:아빠|baby:아기|friend:친구|teacher:선생님|boy:소년|girl:소녀|king:왕|queen:여왕',
  '물건': 'book:책|desk:책상|chair:의자|bag:가방|door:문|window:창문|bed:침대|box:상자|ball:공|car:자동차|clock:시계|key:열쇠|hat:모자|shoe:신발',
  '자연': 'house:집|school:학교|tree:나무|flower:꽃|sun:해|moon:달|star:별|rain:비|sky:하늘|sea:바다|river:강|mountain:산|fire:불|wind:바람',
  '모험': 'sword:칼|shield:방패|dragon:용|gold:금|map:지도|castle:성|ghost:유령|magic:마법',
  '움직임': 'eat:먹다|drink:마시다|run:달리다|walk:걷다|jump:뛰다|swim:수영하다|sleep:자다|read:읽다|write:쓰다|sing:노래하다|dance:춤추다|play:놀다|open:열다|close:닫다|see:보다|go:가다|come:오다|sit:앉다|stand:서다|cry:울다|laugh:웃다',
  '모양·느낌': 'big:큰|small:작은|happy:행복한|sad:슬픈|hot:뜨거운|cold:차가운|fast:빠른|slow:느린|new:새로운|old:낡은|long:긴|short:짧은|good:좋은|bad:나쁜',
};
const T2 = {
  '학교': 'student:학생|homework:숙제|pencil:연필|eraser:지우개|classroom:교실|lesson:수업|question:질문|answer:대답|library:도서관|science:과학|history:역사|music:음악',
  '장소': 'hospital:병원|market:시장|park:공원|bank:은행|restaurant:식당|airport:공항|station:역|kitchen:부엌|garden:정원|island:섬|forest:숲|desert:사막|village:마을',
  '때와 계절': 'morning:아침|evening:저녁|night:밤|week:일주일|year:년|spring:봄|summer:여름|autumn:가을|winter:겨울|cloud:구름',
  '하는 일': 'listen:듣다|speak:말하다|think:생각하다|learn:배우다|teach:가르치다|help:돕다|build:짓다|carry:나르다|catch:잡다|throw:던지다|climb:오르다|push:밀다|pull:당기다|wait:기다리다|buy:사다|sell:팔다',
  '기분과 상태': 'angry:화난|tired:피곤한|hungry:배고픈|busy:바쁜|brave:용감한|quiet:조용한|strong:강한|weak:약한|rich:부유한|poor:가난한|clean:깨끗한|dirty:더러운|easy:쉬운|difficult:어려운',
};
const T3 = {
  '생활': 'weather:날씨|health:건강|money:돈|price:가격|travel:여행|festival:축제|holiday:휴일|nature:자연|problem:문제|reason:이유|example:예시|future:미래|past:과거|memory:기억|dream:꿈|hobby:취미|subject:과목|vacation:방학|exercise:운동|neighbor:이웃',
  '하는 일': 'believe:믿다|decide:결정하다|choose:고르다|remember:기억하다|forget:잊다|borrow:빌리다|prepare:준비하다|practice:연습하다|invite:초대하다|arrive:도착하다|visit:방문하다|enjoy:즐기다|finish:끝내다|plan:계획하다',
  '성질': 'important:중요한|popular:인기 있는|special:특별한|famous:유명한|dangerous:위험한|healthy:건강한|honest:정직한|careful:조심스러운|different:다른|excited:신난|kind:친절한',
};
const T4 = {
  '생활과 사회': 'culture:문화|energy:에너지|result:결과|information:정보|environment:환경|experience:경험|knowledge:지식|technology:기술|pollution:오염|tradition:전통|society:사회|character:성격|population:인구|disease:질병|medicine:약|success:성공|effort:노력',
  '하는 일': 'explain:설명하다|protect:보호하다|discover:발견하다|improve:개선하다|describe:묘사하다|compare:비교하다|imagine:상상하다|solve:해결하다|encourage:격려하다|reduce:줄이다|survive:살아남다|recognize:알아보다|repeat:반복하다|create:창조하다',
  '성질': 'curious:호기심 많은|polite:예의 바른|comfortable:편안한|necessary:필요한|possible:가능한|similar:비슷한|ancient:고대의|anxious:불안한|enormous:거대한|generous:너그러운|valuable:귀중한|various:다양한',
};
const T5 = {
  '생각과 사회': 'opportunity:기회|achievement:성취|attitude:태도|behavior:행동|influence:영향|resource:자원|community:공동체|evidence:증거|research:연구|solution:해결책|government:정부|economy:경제|curiosity:호기심|ambition:야망|responsibility:책임|relationship:관계|advantage:장점|disadvantage:단점',
  '하는 일': 'achieve:이루다|consider:고려하다|maintain:유지하다|persuade:설득하다|require:요구하다|contribute:기여하다|obtain:얻다|establish:설립하다|indicate:나타내다|analyze:분석하다|overcome:극복하다|emphasize:강조하다|hesitate:망설이다',
  '성질': 'accurate:정확한|essential:필수적인|independent:독립적인|temporary:일시적인|efficient:효율적인|obvious:명백한|flexible:유연한|significant:상당한|sufficient:충분한|positive:긍정적인|negative:부정적인',
};
export const WORDS = [T1, T2, T3, T4, T5].flatMap((groups, tier) => Object.entries(groups).flatMap(([cat, s]) =>
  s.split('|').map(p => { const [en, ko] = p.split(':'); return { en, ko, tier, cat: `${TIERS[tier]} · ${cat}` }; })));
// 지금 기계 레벨의 단어 단계 (0부터)
export const curTier = () => Math.min(state.level, TIERS.length) - 1;
// 단어 외우기에는 지금 단계까지 전부 보여 준다
export const allWords = () => WORDS.filter(w => w.tier <= curTier());
