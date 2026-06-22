import Pedal from './Pedal';

export default function Pedalboard({ pedals, onToggle, onParamChange, onTapTempo, compReductionRef }) {
  return (
    <main className="pedalboard">
      {pedals.map(pedal => (
        <Pedal
          key={pedal.id}
          pedal={pedal}
          onToggle={onToggle}
          onParamChange={onParamChange}
          onTapTempo={pedal.hasTapTempo ? onTapTempo : undefined}
          compReductionRef={pedal.hasReduction ? compReductionRef : undefined}
        />
      ))}
    </main>
  );
}
