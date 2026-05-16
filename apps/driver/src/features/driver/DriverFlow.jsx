import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icons.jsx';
import { MapSurface } from '../../components/MapSurface.jsx';
import { SlideToConfirm } from '../../components/SlideToConfirm.jsx';
import { StatusBar } from '../../components/StatusBar.jsx';
import { Tag } from '../../components/Tag.jsx';
import { currentOffer, driver, hotspots } from './mockData.js';

const screens = {
  idle: 'idle',
  offer: 'offer',
  toPickup: 'toPickup',
  atPickup: 'atPickup',
  toDropoff: 'toDropoff',
  atDropoff: 'atDropoff',
  complete: 'complete',
};

export function DriverFlow() {
  const [screen, setScreen] = useState(screens.idle);
  const [online, setOnline] = useState(false);
  const [completedJobs, setCompletedJobs] = useState(0);

  const earnings = driver.todayEarnings + completedJobs * 13.2;
  const jobs = driver.todayJobs + completedJobs;

  function go(next) {
    if (next === screens.idle) setOnline(true);
    if (next === screens.complete) setCompletedJobs((count) => count + 1);
    setScreen(next);
  }

  if (screen === screens.offer) return <OfferScreen onAccept={() => go(screens.toPickup)} onDecline={() => go(screens.idle)} />;
  if (screen === screens.toPickup) return <RouteScreen mode="pickup" onArrived={() => go(screens.atPickup)} />;
  if (screen === screens.atPickup) return <PickupScreen earnings={earnings} jobs={jobs} onConfirm={() => go(screens.toDropoff)} onCancel={() => go(screens.idle)} />;
  if (screen === screens.toDropoff) return <RouteScreen mode="dropoff" onArrived={() => go(screens.atDropoff)} />;
  if (screen === screens.atDropoff) return <DropoffScreen earnings={earnings} jobs={jobs} onComplete={() => go(screens.complete)} />;
  if (screen === screens.complete) return <CompleteScreen earnings={earnings} jobs={jobs} onNext={() => go(screens.idle)} />;

  return (
    <IdleScreen
      online={online}
      earnings={earnings}
      jobs={jobs}
      onOnline={() => setOnline(true)}
      onOffline={() => setOnline(false)}
      onOffer={() => go(screens.offer)}
    />
  );
}

function IdleScreen({ online, earnings, jobs, onOnline, onOffline, onOffer }) {
  return (
    <section className="screen">
      <StatusBar online={online} earnings={earnings} jobs={jobs} />
      <div style={{ padding: '24px 20px 18px', background: 'var(--cs-ink)', color: 'white' }}>
        <div className="mono-label" style={{ color: 'rgba(255,255,255,.55)' }}>Earnings - Wed</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
          <strong style={{ fontSize: 56, letterSpacing: -2.5, lineHeight: 1 }}>${earnings.toFixed(0)}</strong>
          <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'rgba(255,255,255,.5)' }}>CAD</span>
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 16, color: 'rgba(255,255,255,.72)', fontSize: 13 }}>
          <span><b style={{ color: 'white' }}>{jobs}</b> jobs</span>
          <span><b style={{ color: 'white' }}>{driver.hoursOnline}h</b> online</span>
          <span><b style={{ color: 'white' }}>{driver.kilometersDriven} km</b> driven</span>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {!online ? (
          <SlideToConfirm label="Slide to go online" color="var(--cs-ok)" icon={<Icon.flash color="var(--cs-ok)" />} onConfirm={onOnline} />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(63,185,107,.12)', display: 'grid', placeItems: 'center', position: 'relative' }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: 22, border: '2px solid #3fb96b', animation: 'cs-ping 1.6s ease-out infinite' }} />
                <Icon.flash size={18} color="var(--cs-ok)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Looking for jobs nearby</div>
                <div style={{ color: 'var(--cs-slate-500)', fontSize: 13, marginTop: 2 }}>Average wait this hour: 6 min</div>
              </div>
              <button className="secondary-button" style={{ minHeight: 36, padding: '0 14px' }} onClick={onOffline}>Stop</button>
            </div>
            <button className="primary-button" onClick={onOffer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon.flash size={16} color="white" /> Simulate incoming job
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '4px 20px 16px' }}>
        <div className="mono-label" style={{ marginBottom: 12 }}>Where it is busy</div>
        <div className="card" style={{ padding: 14, display: 'grid', gap: 12 }}>
          {hotspots.map((spot) => (
            <div key={spot.area} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: spot.demand > 0.8 ? 'var(--cs-accent)' : spot.demand > 0.5 ? 'var(--cs-warn)' : 'var(--cs-slate-300)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>{spot.area}</div>
                <div style={{ color: 'var(--cs-slate-500)', fontSize: 12 }}>{spot.level} - next job {spot.wait}</div>
              </div>
              <div style={{ width: 56, height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--cs-slate-100)' }}>
                <div style={{ width: `${spot.demand * 100}%`, height: '100%', background: spot.demand > 0.8 ? 'var(--cs-accent)' : 'var(--cs-ink)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 20px 36px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          ['Earnings', <Icon.wallet size={16} />],
          ['Schedule', <Icon.clock size={16} />],
          ['Help', <Icon.shield size={16} />],
        ].map(([label, icon]) => (
          <button key={label} className="card" style={{ padding: '14px 10px', cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 6 }}>
            {icon}
            <span style={{ fontSize: 12, fontWeight: 650 }}>{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function OfferScreen({ onAccept, onDecline }) {
  const [seconds, setSeconds] = useState(15);

  useEffect(() => {
    if (seconds <= 0) {
      onDecline();
      return undefined;
    }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, onDecline]);

  return (
    <section className="screen screen-no-scroll" style={{ background: 'var(--cs-ink)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.16 }}>
        <MapSurface dark />
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ padding: '64px 20px 0', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, border: '6px solid rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', color: 'white' }}>
            <strong style={{ fontFamily: 'var(--cs-mono)', fontSize: 28 }}>{seconds}</strong>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 28px', boxShadow: '0 -20px 50px -20px rgba(0,0,0,.5)', display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag tone="accent" icon={<Icon.flash size={11} />}>New</Tag>
            <span className="mono-label">{currentOffer.id} - {currentOffer.service}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <strong style={{ fontSize: 52, letterSpacing: -2, lineHeight: 1 }}>${currentOffer.payout.toFixed(2)}</strong>
            <div style={{ paddingBottom: 8, color: 'var(--cs-slate-500)', fontSize: 13, lineHeight: 1.4 }}>
              <div><b style={{ color: 'var(--cs-ink)' }}>{currentOffer.distanceKm} km</b> - ~{currentOffer.etaMinutes} min</div>
              <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11 }}>${currentOffer.totalFare} fare - 80% to you</div>
            </div>
          </div>
          <RouteSummary />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag>{currentOffer.parcel.size} - {currentOffer.parcel.weight}</Tag>
            <Tag tone="warn" icon={<Icon.shield size={12} />}>Fragile</Tag>
            <Tag icon={<Icon.package size={12} />}>Cake</Tag>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="secondary-button" style={{ flex: 1 }} onClick={onDecline}>Decline</button>
            <button className="primary-button" style={{ flex: 2 }} onClick={onAccept}>Accept - ${currentOffer.payout.toFixed(2)}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteSummary() {
  return (
    <div style={{ background: 'var(--cs-paper)', borderRadius: 14, padding: 14, display: 'flex', gap: 14 }}>
      <div style={{ display: 'grid', justifyItems: 'center', paddingTop: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--cs-ink)' }} />
        <span style={{ width: 2, minHeight: 22, background: 'var(--cs-slate-200)' }} />
        <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--cs-accent)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <AddressBlock label={`Pickup - ${currentOffer.pickupEtaMinutes} min away`} place={currentOffer.pickup} />
        <div style={{ height: 12 }} />
        <AddressBlock label="Drop-off" place={currentOffer.dropoff} />
      </div>
    </div>
  );
}

function AddressBlock({ label, place }) {
  return (
    <div>
      <div className="mono-label">{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{place.address}</div>
      <div style={{ color: 'var(--cs-slate-500)', fontSize: 12 }}>{place.neighborhood}</div>
    </div>
  );
}

function RouteScreen({ mode, onArrived }) {
  const isPickup = mode === 'pickup';
  const place = isPickup ? currentOffer.pickup : currentOffer.dropoff;

  return (
    <section className="screen screen-no-scroll" style={{ background: '#e8ebef' }}>
      <MapSurface phase={isPickup ? 0 : 2} />
      <div style={{ position: 'absolute', top: 44, left: 12, right: 12, background: 'var(--cs-ink)', color: 'white', borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 12px 30px -10px rgba(11,18,32,.5)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--cs-accent)', display: 'grid', placeItems: 'center' }}>
          <Icon.arrow color="white" size={22} />
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,.55)' }} className="mono-label">In 250 m</div>
          <div style={{ fontSize: 16, fontWeight: 750 }}>Turn left onto {isPickup ? 'Princess St' : 'Osborne St'}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 130, right: 12, display: 'grid', gap: 10 }}>
        <button className="icon-button" style={{ background: 'rgba(255,255,255,.92)' }}><Icon.phone size={16} /></button>
        <button className="icon-button" style={{ background: 'rgba(255,255,255,.92)' }}><Icon.send size={16} /></button>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'white', borderRadius: '22px 22px 0 0', paddingBottom: 28, boxShadow: '0 -20px 50px -20px rgba(11,18,32,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <span style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--cs-slate-200)' }} />
        </div>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag tone={isPickup ? 'accent' : 'ink'} icon={isPickup ? <Icon.pin size={11} /> : <Icon.package size={12} />}>{isPickup ? 'Pickup' : 'Drop-off'}</Tag>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', fontSize: 12 }}>{currentOffer.id}</span>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.6 }}>{place.address}{!isPickup ? ` - ${place.unit}` : ''}</h1>
          <p style={{ margin: '3px 0 0', color: 'var(--cs-slate-500)', fontSize: 13 }}>{place.neighborhood} - {place.name}</p>
          {!isPickup && <p style={{ margin: '10px 0 0', padding: 12, background: 'var(--cs-paper)', borderRadius: 12, borderLeft: '3px solid var(--cs-accent)', color: 'var(--cs-slate-700)', fontSize: 13 }}>{place.note}</p>}
        </div>
        <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            ['ETA', isPickup ? '4 min' : '7 min'],
            ['Distance', isPickup ? '0.8 km' : '2.4 km'],
            ['Payout', '$11.20'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: 10, background: 'var(--cs-slate-50)', borderRadius: 10 }}>
              <div className="mono-label">{label}</div>
              <div style={{ fontWeight: 750, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px 0' }}>
          <SlideToConfirm label="Slide when arrived" onConfirm={onArrived} />
        </div>
      </div>
    </section>
  );
}

function PickupScreen({ earnings, jobs, onConfirm, onCancel }) {
  const [photoTaken, setPhotoTaken] = useState(false);

  return (
    <section className="screen">
      <StatusBar online earnings={earnings} jobs={jobs} />
      <div style={{ padding: '20px 20px 14px' }}>
        <Tag tone="accent" icon={<Icon.pin size={11} />}>At pickup</Tag>
        <h1 style={{ margin: '12px 0 0', fontSize: 28, letterSpacing: -0.8 }}>Confirm the parcel.</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--cs-slate-500)', fontSize: 14, lineHeight: 1.45 }}>Match the description, capture a photo, then confirm pickup.</p>
      </div>
      <ContactCard person={currentOffer.pickup} />
      <DetailCard rows={[
        ['Size', 'Medium - around 10 lb max'],
        ['Description', currentOffer.parcel.description],
        ['Handling', currentOffer.parcel.handling.join(' - ')],
      ]} />
      <ProofPhoto title="Photo proof" taken={photoTaken} onTake={() => setPhotoTaken(true)} />
      <div style={{ flex: 1 }} />
      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: 'white' }}>
        <SlideToConfirm label="Slide to confirm pickup" color="var(--cs-ok)" onConfirm={onConfirm} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <button className="text-button">Wrong parcel?</button>
          <button className="text-button" onClick={onCancel}>Cancel job</button>
        </div>
      </div>
    </section>
  );
}

function DropoffScreen({ earnings, jobs, onComplete }) {
  const [proofType, setProofType] = useState('photo');
  const [photoTaken, setPhotoTaken] = useState(false);
  const [code, setCode] = useState(['', '', '', '']);
  const [hasSignature, setHasSignature] = useState(false);
  const proofValid = proofType === 'photo' ? photoTaken : proofType === 'signature' ? hasSignature : code.every(Boolean);

  return (
    <section className="screen">
      <StatusBar online earnings={earnings} jobs={jobs} />
      <div style={{ padding: '20px 20px 14px' }}>
        <Tag tone="ink" icon={<Icon.package size={12} />}>At drop-off</Tag>
        <h1 style={{ margin: '12px 0 0', fontSize: 28, letterSpacing: -0.8 }}>Hand it off.</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--cs-slate-500)', fontSize: 14, lineHeight: 1.45 }}>{currentOffer.dropoff.address} - {currentOffer.dropoff.unit} - {currentOffer.dropoff.name}</p>
      </div>
      <div style={{ padding: '0 20px 14px' }}>
        <Segmented value={proofType} onChange={setProofType} options={[['photo', 'Photo'], ['signature', 'Signature'], ['code', 'Code']]} />
      </div>
      <div style={{ padding: '0 20px 14px', flex: 1 }}>
        {proofType === 'photo' && <ProofPhoto title="Delivery photo" taken={photoTaken} onTake={() => setPhotoTaken(true)} minHeight={190} />}
        {proofType === 'signature' && <SignaturePad onSigned={() => setHasSignature(true)} onClear={() => setHasSignature(false)} />}
        {proofType === 'code' && <CodeProof code={code} setCode={setCode} />}
      </div>
      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: 'white' }}>
        {proofValid ? (
          <SlideToConfirm label="Slide to complete delivery" color="var(--cs-ok)" onConfirm={onComplete} />
        ) : (
          <button disabled className="secondary-button" style={{ width: '100%', color: 'var(--cs-slate-500)', cursor: 'not-allowed' }}>
            {proofType === 'photo' ? 'Take a photo to continue' : proofType === 'signature' ? 'Capture signature to continue' : 'Enter code to continue'}
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <button className="text-button">Recipient unavailable?</button>
          <button className="text-button">Need help?</button>
        </div>
      </div>
    </section>
  );
}

function ContactCard({ person }) {
  return (
    <div style={{ padding: '0 20px 14px' }}>
      <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, #c94a1b, #e76a3a)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{person.name.split(' ').map((part) => part[0]).join('')}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{person.name}</div>
          <div style={{ color: 'var(--cs-slate-500)', fontSize: 12 }}>{person.address} - {person.unit}</div>
        </div>
        <button className="icon-button"><Icon.phone size={16} /></button>
      </div>
    </div>
  );
}

function DetailCard({ rows }) {
  return (
    <div style={{ padding: '0 20px 14px' }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        {rows.map(([key, value], index) => (
          <div key={key} style={{ display: 'flex', padding: '12px 16px', borderTop: index ? '1px solid var(--cs-slate-100)' : 0 }}>
            <div className="mono-label" style={{ width: 112, paddingTop: 2 }}>{key}</div>
            <div style={{ flex: 1, fontSize: 14 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProofPhoto({ title, taken, onTake, minHeight }) {
  return (
    <div style={{ padding: '0 20px 14px' }}>
      <div className="mono-label" style={{ marginBottom: 10 }}>{title}</div>
      <button onClick={onTake} style={{ width: '100%', minHeight: minHeight ?? 150, aspectRatio: minHeight ? undefined : '16 / 9', border: taken ? 0 : '1.5px dashed var(--cs-slate-300)', borderRadius: 16, background: taken ? 'var(--cs-ink)' : 'white', color: taken ? 'white' : 'var(--cs-slate-500)', cursor: 'pointer', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative' }}>
        {taken && <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2b3548, #5b657a 60%, #8590a6)' }} />}
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 650 }}>
          {taken ? <Icon.check color="white" stroke={2.5} /> : <Icon.package size={20} />}
          {taken ? 'Photo captured - tap to retake' : 'Tap to take a photo'}
        </span>
      </button>
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', padding: 4, background: 'var(--cs-slate-100)', borderRadius: 12, gap: 2 }}>
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} style={{ flex: 1, height: 36, border: 0, borderRadius: 9, cursor: 'pointer', background: key === value ? 'white' : 'transparent', color: key === value ? 'var(--cs-ink)' : 'var(--cs-slate-500)', fontWeight: 700 }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function SignaturePad({ onSigned, onClear }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  function draw(event) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'var(--cs-ink)';
    ctx.beginPath();
    ctx.arc(event.nativeEvent.offsetX || event.clientX - rect.left, event.nativeEvent.offsetY || event.clientY - rect.top, 2.2, 0, Math.PI * 2);
    ctx.fill();
    onSigned();
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }

  return (
    <div className="card" style={{ padding: 14, display: 'grid', gap: 10 }}>
      <div className="mono-label">Sign here</div>
      <canvas ref={canvasRef} width={640} height={260} onPointerDown={() => { drawing.current = true; }} onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} style={{ width: '100%', height: 160, borderRadius: 10, background: 'var(--cs-paper)', borderBottom: '1.5px solid var(--cs-ink)', touchAction: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--cs-slate-500)', fontSize: 12 }}>Recipient signature</span>
        <button className="text-button" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}

function CodeProof({ code, setCode }) {
  return (
    <div className="card" style={{ padding: 20, display: 'grid', gap: 14, justifyItems: 'center' }}>
      <p style={{ margin: 0, color: 'var(--cs-slate-700)', fontSize: 14, textAlign: 'center' }}>Ask the recipient for the 4-digit code from their notification.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        {code.map((digit, index) => (
          <input key={index} value={digit} inputMode="numeric" maxLength={1} onChange={(event) => {
            const next = [...code];
            next[index] = event.target.value.replace(/\D/g, '').slice(0, 1);
            setCode(next);
          }} style={{ width: 56, height: 64, borderRadius: 12, border: `1.5px solid ${digit ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`, textAlign: 'center', fontFamily: 'var(--cs-mono)', fontSize: 28, fontWeight: 800 }} />
        ))}
      </div>
      <div className="mono-label">4-digit handoff code</div>
    </div>
  );
}

function CompleteScreen({ earnings, jobs, onNext }) {
  const [rating, setRating] = useState(5);

  return (
    <section className="screen" style={{ background: 'var(--cs-ink)', color: 'white' }}>
      <div style={{ padding: '64px 20px 0', display: 'grid', justifyItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(63,185,107,.15)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: '#3fb96b', display: 'grid', placeItems: 'center' }}><Icon.check color="white" stroke={3} size={22} /></span>
        </div>
        <div style={{ color: 'rgba(255,255,255,.5)' }} className="mono-label">Delivered - 1:22 PM</div>
        <h1 style={{ margin: '8px 0 0', fontSize: 32, lineHeight: 1.1, letterSpacing: -1 }}>Nice work.<br />Booked.</h1>
      </div>
      <div style={{ padding: '28px 20px 12px' }}>
        <div style={{ background: 'white', color: 'var(--cs-ink)', borderRadius: 22, padding: 20 }}>
          <div className="mono-label">You earned</div>
          <strong style={{ display: 'block', fontSize: 54, letterSpacing: -2.2, lineHeight: 1, marginTop: 4 }}>$13.20</strong>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--cs-slate-100)', display: 'grid', gap: 8, fontSize: 13 }}>
            {[
              ['Base fare', '$11.20'],
              ['Tip from sender', '+$2.00'],
              ['Distance', '3.2 km'],
              ['Time on job', '24 min'],
            ].map(([key, value]) => <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{key}</span><b>{value}</b></div>)}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--cs-accent)', display: 'grid', placeItems: 'center' }}><Icon.wallet color="white" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,.5)' }} className="mono-label">Today so far</div>
            <b>{earnings.toFixed(2)} - {jobs} jobs</b>
          </div>
          <Icon.chevron color="rgba(255,255,255,.5)" />
        </div>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700 }}>How was Sasha?</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Optional - only the rating is shared.</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} onClick={() => setRating(value)} style={{ flex: 1, height: 44, border: 0, borderRadius: 10, background: 'transparent', color: value <= rating ? 'var(--cs-accent-2)' : 'rgba(255,255,255,.2)', cursor: 'pointer' }}>
                <Icon.star size={26} fill="currentColor" stroke={0} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 20px 36px', display: 'grid', gap: 10 }}>
        <button className="primary-button" onClick={onNext}>Stay online - find next job</button>
        <button onClick={onNext} style={{ minHeight: 48, border: 0, background: 'transparent', color: 'rgba(255,255,255,.7)', fontWeight: 650, cursor: 'pointer' }}>End shift</button>
      </div>
    </section>
  );
}
