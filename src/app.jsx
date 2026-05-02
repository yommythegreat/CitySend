// Top-level App — design canvas with brand, prototype artboards, design system.
// Also: tweaks panel for accent color, map style, prototype starting screen.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c94a1b",
  "mapStyle": "light"
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Artboards for each major screen in the prototype — each is an independent
  // Prototype instance starting at that screen so viewers can jump straight to it.
  const protoAB = (id, label, start) => (
    <DCArtboard id={id} label={label} width={402} height={874}>
      <IOSDevice width={402} height={874}>
        <Prototype accent={tw.accent} mapStyle={tw.mapStyle} initialScreen={start} />
      </IOSDevice>
    </DCArtboard>
  );

  return (
    <>
      <DesignCanvas>
        <DCSection id="brand" title="Brand identity" subtitle="Logo system · palette · type · voice">
          <DCArtboard id="brand" label="Brand overview" width={1040} height={1700}>
            <BrandIdentity />
          </DCArtboard>
        </DCSection>

        <DCSection id="flow" title="Core flow · 402×874" subtitle="Home → request (3 steps) → pricing → pay → live tracking">
          {protoAB('home',    'Home · Landing', 'home')}
          {protoAB('new1',    'New · Pickup',   'new-1')}
          {protoAB('new2',    'New · Drop-off', 'new-2')}
          {protoAB('new3',    'New · Parcel',   'new-3')}
          {protoAB('pricing', 'Pricing',        'pricing')}
          {protoAB('pay',     'Payment',        'pay')}
          {protoAB('track',   'Live tracking',  'tracking')}
        </DCSection>

        <DCSection id="repeat" title="Repeat-user surfaces" subtitle="Where the second, third, tenth delivery lives">
          {protoAB('history',       'History', 'history')}
          {protoAB('notifications', 'Notifications', 'notifications')}
        </DCSection>

        <DCSection id="ds" title="Design system">
          <DCArtboard id="ds" label="Components · tokens · principles" width={1040} height={1450}>
            <DesignSystem />
          </DCArtboard>
        </DCSection>

        <DCPostIt top={140} left={1100} rotate={-3} width={210}>
          Start here → scroll right through each section, or click any artboard label to focus it (←/→ to step through).
        </DCPostIt>
        <DCPostIt top={560} left={1700} rotate={2} width={230}>
          The flow is fully clickable. Fill in the form and tap through — you'll end up on the live map.
        </DCPostIt>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent color" />
        <TweakRadio label="Signal" value={tw.accent} onChange={(v) => setTweak('accent', v)} options={[
            { value: '#c94a1b', label: 'Terra' },
            { value: '#0b1220', label: 'Ink' },
            { value: '#0066ff', label: 'Blue' },
            { value: '#166b3a', label: 'Moss' },
        ]}/>
        <TweakSection label="Map style" />
        <TweakRadio label="Tiles" value={tw.mapStyle} onChange={(v) => setTweak('mapStyle', v)} options={[
            { value: 'light', label: 'Light' },
            { value: 'dark',  label: 'Dark'  },
        ]}/>
      </TweaksPanel>
    </>
  );
}

Object.assign(window, { App });
