import type { ArcLabel as Label } from '../types'

export function ArcLabelModal({ label, onClose, onDress }: { label: Label; onClose: () => void; onDress: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="arc-label" onClick={(e) => e.stopPropagation()}>
        <div className="arc-head">⚠ WARNING</div>
        <div className="arc-title">ARC FLASH AND SHOCK HAZARD<br /><span>APPROPRIATE PPE REQUIRED</span></div>
        <div className="arc-grid">
          <div className="arc-col">
            <h5>Arc flash hazard</h5>
            <div><span>Incident energy</span><b>{label.incidentEnergy} cal/cm²</b></div>
            <div><span>Working distance</span><b>{label.workingDistance} in</b></div>
            <div><span>Arc flash boundary</span><b>{label.arcFlashBoundary} in</b></div>
            <div><span>Minimum arc rating</span><b>{label.minArcRating} cal/cm²</b></div>
          </div>
          <div className="arc-col">
            <h5>Shock hazard</h5>
            <div><span>Nominal voltage</span><b>{label.voltage} V AC 3Ø</b></div>
            <div><span>Limited approach</span><b>{label.limitedApproach} in</b></div>
            <div><span>Restricted approach</span><b>{label.restrictedApproach} in</b></div>
            <div><span>Glove class</span><b>{label.gloveClass}</b></div>
          </div>
        </div>
        <div className="arc-ppe">
          <h5>Required PPE</h5>
          Arc-rated clothing with a minimum arc rating of {label.minArcRating} cal/cm² (shirt and pants, coverall, or suit), arc-rated face shield with balaclava or arc-rated hood,
          hard hat, safety glasses, hearing protection, heavy-duty leather or rubber insulating gloves with leather protectors (class {label.gloveClass}), leather footwear.
        </div>
        <div className="arc-foot">
          <div>{label.equipment}</div>
          <div>Fed from: {label.fedFrom}</div>
          <div>Study date {label.studyDate} · IEEE 1584-2018 · NFPA 70E · Station 4 Electrical</div>
        </div>
        <div className="row" style={{ padding: '0 10px 10px' }}>
          <button className="primary" onClick={onDress}>Dress for this label →</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
