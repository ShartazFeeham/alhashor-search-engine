import { colorOf } from '../lib/topPickColors';
import Icon from '../ui/Icon';

// The small rounded colour tile with a list icon at the left of a set's card.
export default function PickTile({ set }) {
  const color = colorOf(set);
  return (
    <span className="plan-tile" data-testid="pick-tile" data-color={color} style={{ '--tile-bg': `var(--pick-${color}-bg)`, '--tile-fg': `var(--pick-${color}-fg)` }}>
      <Icon name="list" size={20} />
    </span>
  );
}
