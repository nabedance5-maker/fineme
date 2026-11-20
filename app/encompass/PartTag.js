// きたえる場所の札（色付き）。種目の名前の横・上に出して、どこをきたえる種目か分かるようにする
import { PART_COLOR, PART_LABEL } from '@/lib/encompass/exercises';

export default function PartTag({ part, style }) {
  if (!PART_LABEL[part]) return null;
  return (
    <span
      style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 15, fontWeight: 700, lineHeight: 1.5,
        background: PART_COLOR[part], color: '#fff', whiteSpace: 'nowrap', ...style,
      }}
    >
      {PART_LABEL[part]}
    </span>
  );
}
