// 쉬운 영단어 (주제별). 뜻이 겹치지 않게 골랐다: 뜻만 보고 영어를 써야 하니까
const GROUPS = {
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
export const WORDS = Object.entries(GROUPS).flatMap(([cat, s]) =>
  s.split('|').map(p => { const [en, ko] = p.split(':'); return { en, ko, cat }; }));
export const allWords = () => WORDS;
