// ============ PINK SIGNAL — the ten story missions ============
import { State, setFlag, getFlag, addEvidence, phoneAdd, saveGame } from './state.js';

export class MissionFail extends Error {
  constructor(msg) { super(msg); this.name = 'MissionFail'; }
}

function aborted(signal) {
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
}

const CROWD_LOOKS = [
  { outfit: 0x1f1320, accent: 0xc9a45c, skin: 0xc09070, hair: 0x17100a, hairLong: true },
  { outfit: 0x14181f, accent: 0x4d7fb5, skin: 0xb98a64, hair: 0x14100c },
  { outfit: 0x221016, accent: 0xff2d7e, skin: 0xc9987d, hair: 0x140b08, hairLong: true },
  { outfit: 0x191922, accent: 0xc9a45c, skin: 0xa97f58, hair: 0x111009 },
  { outfit: 0x101418, accent: 0x888899, skin: 0xb08158, hair: 0x222222 },
  { outfit: 0x241d10, accent: 0xc9a45c, skin: 0xbb8d68, hair: 0x100b08 },
];

function crowd(world, spots, prefix = 'guest') {
  spots.forEach(([x, z], i) => {
    world.addNPC(prefix + i, CROWD_LOOKS[i % CROWD_LOOKS.length], x, z, Math.random() * Math.PI * 2);
  });
}

// ================================================================
export const MISSIONS = [

  // ---------------------------------------------------------- M1: THE PARTY
  {
    loc: 'partyHall',
    music: 'party',
    setup(ctx) {
      const { world, game, audio } = ctx;
      world.teleport(0, 8.6, 0);
      audio.crowd(true);
      crowd(world, [[-2, 4], [2.5, 3.5], [-4, -1], [3.8, -3.5], [-1, -4.5], [-8.5, 6.5],
        [9, 6.8], [-9.5, -7.5], [5.5, -6], [-5.5, 5.8], [1, -0.5], [10.5, -7.8]]);
      game.addCharNPC('mahira', 1.6, 1.8, 2.6, { name: 'Mahira' });
      game.addCharNPC('bluesuit', 11.6, -4.6, -1.2, { name: '???' });
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;

      game.obj('Walk to the main hall');
      await world.waitForZone('mainHall', signal);

      game.obj('Speak to Mahira, the event assistant');
      await world.waitForInteract('npc_mahira', signal);
      await game.lines([
        ['mahira', 'Pinky, everyone is asking for you.'],
        ['zara', 'Everyone always asks for me when they need something.'],
        ['mahira', 'There is a man at the bar. Blue suit. He said he will only speak to you.'],
        ['zara', 'Of course he did.'],
      ]);

      game.obj('Meet the man in the blue suit');
      await world.waitForInteract('npc_bluesuit', signal);
      await game.lines([['bluesuit', 'The package is for table seven.']]);
      const c = await game.choices([
        '“I don’t handle packages.”',
        '“Who sent this?”',
        '“Leave it there.”',
        '“Tell Mirza I’m not his staff.”',
      ]);
      if (c === 0) {
        State.mirzaTrust -= 1;
        await game.lines([['zara', 'I don’t handle packages.'], ['bluesuit', 'Tonight you do. His orders.']]);
      } else if (c === 1) {
        await game.lines([['zara', 'Who sent this?'], ['bluesuit', 'You already know. He does not repeat himself.']]);
      } else if (c === 2) {
        world.addSuspicion(0);
        await game.lines([['zara', 'Leave it there.'], ['bluesuit', 'It cannot wait. Neither can he.']]);
      } else {
        State.mirzaTrust -= 2; State.humanity += 1;
        await game.lines([['zara', 'Tell Mirza I’m not his staff.'], ['bluesuit', 'I will tell him. Word for word.']]);
      }
      await game.lines([['bluesuit', 'Take your bag. Smile. And forget my face.']]);
      saveGame();

      game.obj('Pick up the pink handbag');
      world.addInteractable('handbag', world.tags.handbag, ' Pick up the pink handbag');
      await world.waitForInteract('handbag', signal);
      world.tags.handbag.visible = false;
      game.collect('ev_pinkbox');
      ui.notify('ITEM', 'The pink handbag is heavier than it should be.');

      game.obj('Answer Mirza’s call');
      await world.wait(1.2, signal);
      await ui.incomingCall('mirza');
      await game.lines([
        ['mirza', 'Leave the party, Pinky. Now.'],
        ['zara', 'Why? It’s my party.'],
        ['mirza', 'In four minutes it will not be anyone’s party. Use my elevator. Do not run. Walk.'],
      ]);

      game.obj('Leave before the police arrive — use the private elevator');
      audio.siren(true);
      world.policeFlash(0, 2.2, 10.5, 9);
      ui.notify('WARNING', 'Police units are closing in on the tower.');
      const timer = game.countdown(75, signal);
      const result = await Promise.race([
        world.waitForZone('elevator', signal).then(() => 'ok'),
        timer.expired.then(() => 'late'),
      ]);
      timer.stop();
      if (result === 'late') throw new MissionFail('The police sealed the exits.');
      audio.sfx('elevator');
      audio.siren(false);
      audio.crowd(false);
      await game.lines([['zara', 'Walk. Smile. Breathe. Like nothing in this bag can bury you.']]);
    },
  },

  // ---------------------------------------------------------- M2: THE FIRST SIGNAL
  {
    loc: 'apartment',
    music: 'tension',
    setup(ctx) {
      const { world, audio } = ctx;
      world.teleport(0, 4.2, 0);
      audio.rain(true);
      world.tags.note.visible = true;
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      await game.lines([['narrator', 'Home. 2:40 AM. The party is over, but the night is not.']]);

      game.obj('Check your phone messages');
      phoneAdd('threats', { from: 'UNKNOWN NUMBER', time: '2:41 AM', threat: true, body: 'You walked out before the police came in. Lucky. Or warned. Either way — you owe us.' });
      phoneAdd('messages', { from: 'Mahira', time: '2:14 AM', body: 'Pinky are you safe??? They took three guests for questioning. Call me.' });
      ui.phoneNotif(true);
      await game.waitPhone(signal, 'threats');
      await game.lines([['zara', 'They know I left early. They know everything I do.']]);

      game.obj('Find the hidden note');
      world.addInteractable('note', world.tags.note, ' Pick up the note');
      await world.waitForInteract('note', signal);
      world.tags.note.visible = false;
      game.collect('ev_note');
      await game.lines([['zara', '“The signal comes tonight. Be ready.” … signed J.M.']]);

      game.obj('Listen to Mirza’s voice message');
      ui.phoneNotif(true);
      audio.sfx('phone');
      world.addInteractable('dock', world.tags.phoneDock, ' Play the voice message');
      await world.waitForInteract('dock', signal);
      audio.heartbeat(true);
      await game.lines([
        ['mirza', 'From now on, when the pink signal appears, you follow the instructions. Do not ask who. Do not ask why.'],
      ]);
      audio.heartbeat(false);

      game.obj('Decide what to do with the message');
      const c = await game.choices([
        'Save the message as evidence',
        'Delete the message',
        'Send it to Mahnoor Ali',
        'Ignore it',
      ]);
      if (c === 0) {
        setFlag('savedVoiceNote');
        game.collect('ev_voicenote');
        await game.lines([['zara', 'If I fall, I will not fall alone.']]);
      } else if (c === 1) {
        setFlag('deletedVoiceNote'); State.humanity -= 1;
        await game.lines([['zara', 'No message. No proof. No problem… for him.'],
          ['narrator', 'Deleting evidence will haunt the ending of this story.']]);
      } else if (c === 2) {
        setFlag('savedVoiceNote'); setFlag('sentToMahnoor');
        State.mahnoorTrust += 2;
        game.collect('ev_voicenote');
        phoneAdd('messages', { from: 'Mahnoor Ali', time: '2:58 AM', body: 'Received. This is real. Do NOT send anything else over this line. We meet in person.' });
        ui.phoneNotif(true);
        await game.lines([['zara', 'One copy with the only journalist who isn’t for sale.']]);
      } else {
        await game.lines([['zara', 'Not tonight. I can’t think tonight.']]);
      }
      saveGame();
      await game.lines([['narrator', 'Outside, somewhere in the wet city, a pink light blinked twice. The signal was active.']]);
    },
  },

  // ---------------------------------------------------------- M3: ELITE CIRCLE
  {
    loc: 'farmhouse',
    music: 'tension',
    setup(ctx) {
      const { world, game, audio } = ctx;
      world.teleport(0, 12.6, 0);
      audio.crowd(true);
      crowd(world, [[-4, 7], [4, 7.4], [-2, -5], [3, -7], [-7, -9], [7, -10], [-3, -11]]);
      game.addCharNPC('mirza', 0, -9.5, 0, { name: 'Senator Mirza' });
      // three powerful guests
      world.addNPC('judge', { outfit: 0x1a1a10, accent: 0xc9a45c, skin: 0xb08158, hair: 0x555555 }, -5, -8, 0.6, { name: null });
      world.addNPC('anchor', { outfit: 0x251522, accent: 0xff2d7e, skin: 0xc09070, hair: 0x17100a, hairLong: true }, 5.5, -5.5, -0.5);
      world.addNPC('tycoon', { outfit: 0x10141c, accent: 0x4d7fb5, skin: 0xa97f58, hair: 0x222222 }, 8, -11, 2.4);
      game.addCharNPC('naveed', -4, -12.5, 0.8, { name: 'Insp. Naveed' });
      world.addGuard('g1', [{ x: -12, z: 5 }, { x: 12, z: 5 }, { x: 12, z: 10 }, { x: -12, z: 10 }], { speed: 1.1, rate: 22 });
      world.addGuard('g2', [{ x: -14, z: -14 }, { x: -6, z: -16 }, { x: -14, z: -18 }], { speed: 1.0, rate: 26 });
      world.addRestricted(-10, -16.2, 6, 4.5, 14); // basement door area
      world.setSuspicionSystem(true);
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      game.suspicionHUD(true);
      await game.lines([['narrator', 'A private farmhouse outside the city. No cameras allowed. No phones at the gate — unless you are Pinky.']]);

      game.obj('Enter the farmhouse');
      await world.waitForZone('hall', signal);

      game.obj('Talk to Senator Mirza');
      await world.waitForInteract('npc_mirza', signal);
      await game.lines([
        ['mirza', 'Look around, Pinky. Judges. Officers. Anchors. All guests. All family.'],
        ['zara', 'Family that owns each other.'],
        ['mirza', 'Family that protects each other. Learn the difference, and you will live longer.'],
      ]);

      game.obj('Identify three powerful guests (3 remaining)');
      world.addInteractable('judge', world.npcs.judge.group, ' Observe the guest');
      world.addInteractable('anchor', world.npcs.anchor.group, ' Observe the guest');
      world.addInteractable('tycoon', world.npcs.tycoon.group, ' Observe the guest');
      let found = 0;
      const seen = async (id, lines) => {
        await world.waitForInteract(id, signal);
        found++;
        await game.lines(lines);
        if (found < 3) game.obj(`Identify three powerful guests (${3 - found} remaining)`);
      };
      await Promise.all([
        seen('judge', [['zara', 'Justice Kamal. He dismissed the warehouse case last spring. Tonight he laughs with the accused.']]),
        seen('anchor', [['zara', 'Rubina Said. Prime time anchor. Her channel buried the story twice.']]),
        seen('tycoon', [['zara', 'Builder Saif Talpur. Half this city is his concrete. The other half is his collateral.']]),
      ]);

      game.obj('Careful — Inspector Naveed is here');
      await world.waitFor(() => {
        const n = world.npcs.npc_naveed;
        const p = world.player.pos;
        return n && Math.hypot(n.group.position.x - p.x, n.group.position.z - p.z) < 3.2;
      }, signal);
      await game.lines([
        ['zara', 'You are police.'],
        ['naveed', 'Tonight, I am a guest.'],
        ['naveed', 'Enjoy the party, madam. Some of us are working.'],
      ]);
      world.npcs.npc_naveed.facePlayer = false;
      world.addGuard('naveedG', [{ x: -4, z: -12.5 }, { x: 6, z: -12 }, { x: 0, z: -6 }], { speed: 0.9, rate: 30, name: null });
      world.removeNPC('npc_naveed');

      game.obj('Find the restricted basement door — avoid Naveed');
      await world.waitForZone('basementDoor', signal);
      audio.sfx('camera');
      game.collect('ev_basement');
      await game.lines([['zara', 'A guarded door at a farmhouse. What do you keep under a party, Senator?']]);

      game.obj('Photograph the guest list in the west room');
      world.addInteractable('guestlist', world.tags.guestlist, ' Photograph the guest list');
      await world.waitForInteract('guestlist', signal);
      audio.sfx('camera');
      game.collect('ev_guestlist');
      await game.lines([['zara', 'Names. Real names. The kind that never appear in police reports.']]);

      game.obj('Leave through the main gate');
      await world.waitForZone('gate', signal);
      audio.crowd(false);
      await game.lines([['narrator', 'She left with a smile and a phone full of dynamite.']]);
      game.suspicionHUD(false);
      world.setSuspicionSystem(false);
    },
  },

  // ---------------------------------------------------------- M4: THE STUDENT
  {
    loc: 'parking',
    music: 'sad',
    setup(ctx) {
      const { world, game } = ctx;
      world.teleport(15, 8.2, 0.15);
      game.addCharNPC('ayan', 16.2, -9.2, -2.6, { name: 'Ayan' });
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      await game.lines([['narrator', 'Parking level B. Below another private event. Engines, echoes, and a boy who should not be here.']]);

      game.obj('Find Ayan near the parking area');
      await world.waitForZone('ayanCorner', signal);

      game.obj('Calm him down');
      await world.waitForInteract('npc_ayan', signal);
      await game.lines([
        ['ayan', 'They said it was just a party.'],
        ['zara', 'It always starts like that.'],
        ['ayan', 'I saw things upstairs. People… important people. They took photos of everyone. I want to go home.'],
        ['zara', 'Look at me. Breathe. You are going to be fine.'],
      ]);

      game.obj('Decide what to do with Ayan');
      const c = await game.choices([
        'Help Ayan escape',
        'Tell him to stay quiet and forget',
        'Call Mirza',
        'Give him Mahnoor’s number',
      ]);
      let betrayed = false;
      if (c === 0) {
        setFlag('helpedAyan'); State.humanity += 2;
        game.collect('ev_ayan');
        await game.lines([
          ['zara', 'You’re leaving tonight. But first, say what you saw. One voice note. For insurance.'],
          ['ayan', 'If they find out—'],
          ['zara', 'They find out everything anyway. At least this way it costs them.'],
        ]);
      } else if (c === 1) {
        State.humanity -= 1;
        await game.lines([
          ['zara', 'Go home. Delete tonight. You were never here.'],
          ['ayan', 'And if they come for me?'],
          ['zara', 'Then you were never anywhere.'],
        ]);
      } else if (c === 2) {
        betrayed = true; setFlag('betrayedAyan'); State.mirzaTrust += 2; State.humanity -= 2;
        await game.lines([
          ['zara', '…It’s me. There’s a loose thread in the parking lot.'],
          ['mirza', 'Good girl. A car is coming. Walk away, Pinky.'],
        ]);
      } else {
        setFlag('helpedAyan'); setFlag('gaveAyanNumber'); State.humanity += 1; State.mahnoorTrust += 1;
        await game.lines([
          ['zara', 'This number. Memorize it, then burn it. Her name is Mahnoor. She is the only honest microphone in this city.'],
          ['ayan', 'Why are you helping me?'],
          ['zara', 'Because nobody helped me.'],
        ]);
      }
      saveGame();

      if (!betrayed) {
        game.obj('Hide Ayan from the guards — get behind the van');
        world.setSuspicionSystem(true);
        game.suspicionHUD(true);
        world.addGuard('sweep1', [{ x: -14, z: 0 }, { x: 10, z: 0 }, { x: 10, z: -8 }, { x: -14, z: -8 }], { speed: 2.0, rate: 34 });
        world.addGuard('sweep2', [{ x: 8, z: 8 }, { x: -12, z: 8 }, { x: -12, z: 2 }], { speed: 1.7, rate: 30 });
        const ayanN = world.npcs.npc_ayan;
        ayanN.walker = { points: [{ x: 14.5, z: 9 }], speed: 2.6 };
        await world.waitForZone('vanHide', signal);
        game.obj('Stay hidden until the sweep passes');
        await world.wait(11, signal);
        world.guards.forEach(g => { g.detect = false; });
        game.suspicionHUD(false);
        world.setSuspicionSystem(false);
        await game.lines([
          ['ayan', 'Thank you… Pinky.'],
          ['zara', 'Don’t thank me. Disappear.'],
        ]);
        world.removeNPC('npc_ayan');
      } else {
        game.obj('Walk away');
        const ayanN = world.npcs.npc_ayan;
        await world.wait(2, signal);
        await game.lines([
          ['narrator', 'A black car rolled down the ramp. Ayan stopped struggling after the door closed.'],
          ['zara', '…I’m sorry, kid. This city eats the soft ones first.'],
        ]);
        world.removeNPC('npc_ayan');
      }

      game.obj('Leave through the exit ramp');
      await world.waitForZone('exit', signal);
    },
  },

  // ---------------------------------------------------------- M5: MEDIA LEAK
  {
    loc: 'cafe',
    music: 'sad',
    setup(ctx) {
      const { world, game, audio } = ctx;
      world.teleport(0, 4.2, 0);
      audio.rain(true);
      game.addCharNPC('mahnoor', 4.8, -2.6, 0.4, { name: 'Mahnoor' });
      world.addNPC('waiter', { outfit: 0x101013, accent: 0x55585e, skin: 0xb98a64, hair: 0x14100c }, -4.5, -0.5, 1.4, { name: null });
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      await game.lines([['narrator', 'Cafe Sarang. Old quarter. The kind of place where nobody important ever goes — which makes it perfect.']]);

      game.obj('Meet Mahnoor at the corner table');
      await world.waitForInteract('npc_mahnoor', signal);
      await game.lines([
        ['mahnoor', 'You are not the whole story, Zara.'],
        ['zara', 'I know.'],
        ['mahnoor', 'Then help me tell the real one.'],
        ['zara', 'First tell me we are alone.'],
      ]);

      game.obj('Check if the waiter is spying');
      const w = world.npcs.waiter;
      w.walker = { points: [{ x: -2, z: -1 }, { x: 2, z: -2.6 }, { x: -4.5, z: -0.5 }], speed: 0.9, loop: true };
      world.addInteractable('waiter', w.group, ' Look closer at the waiter');
      await world.waitForInteract('waiter', signal);
      audio.sfx('camera');
      game.collect('ev_waiter');
      w.walker = { points: [{ x: 0, z: 4.6 }], speed: 3 };
      await game.lines([
        ['zara', 'An earpiece. On a cafe waiter. Someone is paying for our conversation.'],
        ['mahnoor', 'Then we talk fast.'],
      ]);

      game.obj('Decide what to give Mahnoor');
      const hasNote = getFlag('savedVoiceNote');
      const c = await game.choices([
        hasNote ? 'Give her the voice note' : 'Admit you have nothing solid yet',
        'Give her fake information',
        'Walk away',
        'Ask for protection',
      ]);
      if (c === 0) {
        if (hasNote) {
          setFlag('trustedMahnoor'); State.mahnoorTrust += 2;
          await game.lines([
            ['zara', 'Mirza’s voice. His orders. His signal. Run it when I’m gone, not before.'],
            ['mahnoor', 'You won’t be gone. Stories protect their sources — when the stories are big enough.'],
          ]);
        } else {
          State.mahnoorTrust += 1;
          await game.lines([
            ['zara', 'I had his voice once. I let it go. That was my mistake.'],
            ['mahnoor', 'Then we make them give us another one.'],
          ]);
        }
      } else if (c === 1) {
        setFlag('misledMahnoor'); State.mahnoorTrust -= 2; State.humanity -= 1;
        await game.lines([
          ['zara', 'Warehouse district. Thursday shipments. That’s all I know.'],
          ['mahnoor', '…That’s a lie, Zara. But fine. Even your lies are a map.'],
        ]);
      } else if (c === 2) {
        await game.lines([
          ['zara', 'This was a mistake. Forget my face.'],
          ['mahnoor', 'I can forget your face. The city won’t.'],
        ]);
      } else {
        setFlag('askedProtection'); State.mahnoorTrust += 1;
        await game.lines([
          ['zara', 'If I give you everything — can your paper keep me alive?'],
          ['mahnoor', 'No. But it can make killing you very, very expensive.'],
        ]);
      }
      saveGame();

      game.obj('Leave the cafe — don’t be followed');
      await world.waitForZone('door', signal);
      await game.lines([['narrator', 'Outside, a motorbike that had waited too long started its engine a moment too late.']]);
      audio.rain(false);
    },
  },

  // ---------------------------------------------------------- M6: COURT PRESSURE
  {
    loc: 'court',
    music: 'tension',
    setup(ctx) {
      const { world, game, audio } = ctx;
      world.teleport(0, 16.5, 0);
      audio.rain(true);
      audio.crowd(true);
      // media crowd along the barriers
      const spots = [];
      for (let z = 12; z >= -16; z -= 3.4) { spots.push([-4.4, z]); spots.push([4.4, z]); }
      crowd(world, spots, 'press');
      // lawyer near steps
      world.addNPC('lawyer', { outfit: 0x14141c, accent: 0xc9a45c, skin: 0xb08158, hair: 0x333333 }, 2.2, -19.5, -0.4, { name: 'Adv. Faraz' });
      // camera flash pulses
      const flash = world.point(0xffffff, 0, 30, 0, 3, 0);
      world.dynamic.push({ update: (dt, t) => {
        flash.position.z = world.player.pos.z + (Math.random() - 0.5) * 6;
        flash.position.x = (Math.random() - 0.5) * 8;
        flash.intensity = Math.random() < 0.06 ? 14 : Math.max(0, flash.intensity - dt * 90);
      } });
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      await game.lines([['narrator', 'City Court. Fifty cameras, one woman, and a thousand questions she cannot afford to answer.']]);

      game.obj('Walk through the media crowd');
      const qs = [
        ['reporter', 'Madam Shah! Are powerful people involved?'],
        ['reporter', 'Who is behind the network? One name!'],
        ['reporter', 'Are you being used as a scapegoat?'],
      ];
      let qi = 0;
      const qTimer = setInterval(() => {
        if (qi < qs.length) {
          ui.subtitle('Reporter', qs[qi][1]);
          ctx.audio.speak('reporter', qs[qi][1]);
          qi++;
        } else { ui.subtitle(null); clearInterval(qTimer); }
      }, 4200);
      try {
        await world.waitForZone('midway', signal);
      } finally { /* keep questions running a bit */ }

      game.obj('Read the note from your lawyer');
      world.addInteractable('lawyer', world.npcs.lawyer.group, ' Take the lawyer’s note');
      await world.waitForInteract('lawyer', signal);
      clearInterval(qTimer); ui.subtitle(null);
      game.collect('ev_lawyer');
      await game.lines([
        ['narrator', '“Say nothing about the Senator. They only need one wrong sentence.” — Adv. Faraz'],
        ['zara', 'One wrong sentence. Or one right one.'],
      ]);

      game.obj('Reach the court doors');
      await world.waitForZone('courtDoor', signal);

      game.obj('Make your public statement');
      await game.lines([['reporter', 'Madam Shah! The country is listening! What do you say?!']]);
      const c = await game.choices([
        '“I will speak when I am safe.”',
        '“Ask the people who protected this system.”',
        '“I am innocent.”',
        'Stay silent.',
      ]);
      if (c === 0) {
        State.pressure += 1;
        await game.lines([['zara', 'I will speak when I am safe.'],
          ['narrator', 'The clip ran for two days: “WHEN I AM SAFE — what does Pinky fear?”']]);
        phoneAdd('threats', { from: 'UNKNOWN NUMBER', time: 'now', threat: true, body: 'Safe? Wrong word, Pinky. Safety is a subscription. Yours has expired.' });
      } else if (c === 1) {
        State.pressure += 3; State.mirzaTrust -= 2; setFlag('publicAccusation');
        await game.lines([['zara', 'Ask the people who protected this system.'],
          ['narrator', 'Every channel cut to commercials at the same second. That alone was a headline.']]);
        phoneAdd('threats', { from: 'J.M.', time: 'now', threat: true, body: 'Brave. The Circle discusses your retirement tonight.' });
      } else if (c === 2) {
        State.pressure += 1;
        await game.lines([['zara', 'I am innocent.'],
          ['narrator', 'Innocent. The word every guilty person uses, said every anchor who attended the parties.']]);
      } else {
        await game.lines([['narrator', 'She said nothing. Silence, the cameras decided, was the loudest confession.']]);
        State.pressure += 2;
      }
      ui.phoneNotif(true);
      saveGame();
      audio.crowd(false);
      audio.rain(false);
      await game.lines([['narrator', 'Inside the court, the case was adjourned in nine minutes. Outside, the trial never stops.']]);
    },
  },

  // ---------------------------------------------------------- M7: BASEMENT 17
  {
    loc: 'basement',
    music: 'tension',
    setup(ctx) {
      const { world, game } = ctx;
      world.teleport(-15, 6.8, -0.9);
      game.addCharNPC('rayyan', -13.5, 5.5, 2, { name: 'Rayyan' });
      world.addSecurityCamera(8, 2.4, -8.2, 0.4, { sweep: 0.9, speed: 0.45, range: 10 });
      world.addSecurityCamera(-4, 2.4, 8.2, Math.PI - 0.4, { sweep: 0.8, speed: 0.55, range: 9 });
      world.setSuspicionSystem(true);
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      game.suspicionHUD(true);
      await game.lines([
        ['rayyan', 'Records wing. Officially this level flooded in 2019. Officially.'],
        ['zara', 'And unofficially?'],
        ['rayyan', 'Unofficially, the truth needed a basement.'],
      ]);

      game.obj('Follow Rayyan — stay close');
      const r = world.npcs.npc_rayyan;
      r.facePlayer = false;
      r.walker = { points: [{ x: -8, z: 3.7 }, { x: 0, z: 3.7 }, { x: 8, z: 3.7 }, { x: 12, z: 4.5 }], speed: 1.7 };
      await world.waitFor(() => !r.walker, signal);
      game.obj('Avoid the security cameras — reach cabinet 17');
      await world.waitForZone('cab17', signal);
      await game.lines([
        ['rayyan', 'You knew about this place?'],
        ['zara', 'I knew enough to stay alive.'],
        ['rayyan', 'That is not the same as being innocent.'],
        ['zara', 'No. But it is the reason I am still here.'],
      ]);

      game.obj('Find file cabinet 17');
      const cab = world.tags.cab17z;
      const marker = world.box(0.1, 0.1, 0.1, world.mat(0x000000, { emissive: 0xff2d7e, eIntensity: 2 }), 14.1, 1.62, cab, { shadow: false });
      world.addInteractable('cab17', marker, ' Open cabinet 17');
      await world.waitForInteract('cab17', signal);
      audio.sfx('door');

      game.obj('Recover the missing hard drive');
      const drive = world.box(0.28, 0.06, 0.2, world.mat(0x16161c, { emissive: 0x4d7fb5, eIntensity: 0.6 }), 13.8, 1.0, cab, { shadow: false });
      world.addInteractable('drive', drive, ' Take the hard drive');
      await world.waitForInteract('drive', signal);
      drive.visible = false;
      game.collect('ev_drive');
      await game.lines([
        ['rayyan', 'Case 2019-417. The college case. The marked banknotes. It’s all here. They didn’t destroy it — they collected it.'],
        ['zara', 'Insurance. Everyone in the Circle keeps insurance.'],
      ]);

      audio.siren(true);
      ui.notify('WARNING', 'Vehicles upstairs. Naveed’s unit.');
      game.obj('Escape before Naveed arrives');
      const timer = game.countdown(45, signal);
      const result = await Promise.race([
        world.waitForZone('exit', signal).then(() => 'ok'),
        timer.expired.then(() => 'late'),
      ]);
      timer.stop();
      audio.siren(false);
      if (result === 'late') throw new MissionFail('Naveed’s unit sealed the records wing.');
      await game.lines([
        ['rayyan', 'I was never here. You were never here.'],
        ['zara', 'Story of my life.'],
      ]);
      game.suspicionHUD(false);
      world.setSuspicionSystem(false);
    },
  },

  // ---------------------------------------------------------- M8: THE BETRAYAL
  {
    loc: 'safehouse',
    music: null,
    setup(ctx) {
      const { world } = ctx;
      world.teleport(-7, -0.6, -Math.PI / 2);
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      audio.sfx('knock');
      await world.wait(1.4, signal);
      audio.sfx('knock');
      await game.lines([['narrator', 'Police safe house. 3:12 AM. A noise that should not exist in a safe place.']]);
      audio.playMusic('tension');

      game.obj('Check the hallway');
      await world.waitForZone('hallway', signal);
      audio.heartbeat(true);

      game.obj('Find the evidence bag in the living room');
      world.addInteractable('evtable', world.tags.evidenceTable, ' Check the evidence table');
      await world.waitForInteract('evtable', signal);
      await game.lines([
        ['zara', 'Gone. The bag, the copies, the drive — all gone. From a police safe house.'],
        ['zara', 'Nobody broke in. Somebody walked in.'],
      ]);

      game.obj('Check the pink handbag');
      world.addInteractable('bag8', world.tags.handbag, ' Search the handbag');
      await world.waitForInteract('bag8', signal);
      audio.sfx('pickup');
      game.collect('ev_tracker');
      await game.lines([
        ['zara', 'A tracker. Sewn into the lining. The bag he gave me. The bag I carried everywhere.'],
        ['zara', 'They never protected me. They tracked me.'],
      ]);

      audio.siren(true);
      world.policeFlash(11, 2, 0, 8);
      audio.sfx('knock');
      await game.lines([
        ['naveed', 'You really thought they wanted you protected?'],
        ['zara', 'No. I thought they wanted me quiet.'],
        ['naveed', 'Open the door, Pinky. Let’s keep this dignified.'],
      ]);

      game.obj('Escape through the back stairs');
      const timer = game.countdown(35, signal);
      const result = await Promise.race([
        world.waitForZone('backStairs', signal).then(() => 'ok'),
        timer.expired.then(() => 'late'),
      ]);
      timer.stop();
      audio.heartbeat(false);
      audio.siren(false);
      if (result === 'late') throw new MissionFail('Naveed kicked the door in.');
      audio.sfx('door');
      await game.lines([['narrator', 'Down the wet stairs, into the dark — carrying nothing but a tracker and the truth about who planted it.']]);
    },
  },

  // ---------------------------------------------------------- M9: THE FARMHOUSE RETURN
  {
    loc: 'farmhouse',
    music: 'tension',
    setup(ctx) {
      const { world, game, audio } = ctx;
      world.teleport(-20.8, 2.5, -Math.PI / 2);
      audio.rain(true);
      game.addCharNPC('mirza', 16.5, -10.2, 0, { name: null });
      world.npcs.npc_mirza.facePlayer = false;
      world.addNPC('partner', { outfit: 0x14141c, accent: 0xc9a45c, skin: 0xb08158, hair: 0x444444 }, 17.5, -6.2, 2.8);
      world.addGuard('n1', [{ x: -10, z: 8 }, { x: 10, z: 8 }, { x: 10, z: 11 }, { x: -10, z: 11 }], { speed: 1.5, rate: 30 });
      world.addGuard('n2', [{ x: 5, z: -16 }, { x: -5, z: -16 }, { x: -5, z: -19 }], { speed: 1.4, rate: 30 });
      world.addGuard('n3', [{ x: 11, z: -2 }, { x: 11, z: 4 }], { speed: 1.2, rate: 28 });
      world.setSuspicionSystem(true);
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      game.suspicionHUD(true);
      await game.lines([['narrator', 'The farmhouse again. No invitation this time. No party. Just guards, rain, and one last chance.']]);

      game.obj('Slip in through the service gate');
      await world.waitForZone('serviceGate', signal);

      game.obj('Use the old access card on the east wing');
      const panel = world.box(0.16, 0.24, 0.05, world.mat(0x111116, { emissive: 0xb3122e, eIntensity: 0.8 }), 12.1, 1.3, -8, { shadow: false });
      world.addInteractable('panel', panel, ' Swipe the old access card');
      await world.waitForInteract('panel', signal);
      panel.material.emissive.setHex(0x2bd96a);
      audio.sfx('click');
      await game.lines([['zara', 'Still active. Arrogance never updates its locks.']]);

      game.obj('Record Mirza’s meeting — get into the east wing');
      await world.waitForZone('meetingRoom', signal);
      game.obj('Hold position. Recording…');
      ui.timer('● REC');
      const meeting = game.lines([
        ['mirza', 'The shipment list is final. The judge receives his envelope before Friday.'],
        ['mirza', 'The channel gets its advertising budget — and forgets the warehouse story.'],
        ['mirza', 'And the girl… the girl has become a problem. Problems get names. Names get files. Files get closed.'],
      ]);
      await meeting;
      ui.timer(null);
      game.collect('ev_recording');

      game.obj('Find the blackmail room');
      world.addInteractable('shelf', world.tags.blackShelf, ' Move the shelf');
      await world.waitForInteract('shelf', signal);
      audio.sfx('door');
      world.tags.blackShelf.position.x -= 2.6;
      world.colliders = world.colliders.filter(b =>
        !(Math.abs((b.min.x + b.max.x) / 2 - 16.5) < 1.6 && Math.abs((b.min.z + b.max.z) / 2 - (-12.3)) < 1.2));
      await world.waitForZone('blackRoom', signal);
      world.addInteractable('ledger', world.tags.ledger, ' Take the ledger');
      await world.waitForInteract('ledger', signal);
      world.tags.ledger.visible = false;
      game.collect('ev_ledger');
      await game.lines([
        ['zara', 'Photographs. Payments. Names. Every guest who ever smiled at those parties is in this room.'],
        ['zara', 'They didn’t throw parties. They manufactured leverage.'],
      ]);

      game.obj('Upload the evidence from the terminal');
      world.addInteractable('pc', world.tags.uploadPC, ' Start the upload');
      await world.waitForInteract('pc', signal);
      audio.sfx('upload');
      setFlag('uploadedBackup');
      for (let i = 1; i <= 10; i++) {
        ui.timer(`UPLOADING ${i * 10}%`);
        world.addSuspicion(4);
        await world.wait(0.8, signal);
      }
      ui.timer(null);
      audio.sfx('alarm');
      ui.notify('ALERT', 'Silent alarm triggered. Guards converging.');

      await game.lines([
        ['mirza', 'You were nothing before us.'],
        ['zara', 'I was free before you.'],
        ['mirza', 'Freedom is what poor people call loneliness.'],
        ['zara', 'And power is what cowards call fear.'],
        ['mirza', 'Guards! She is in the east wing!'],
      ]);

      game.obj('Escape — get back to the service gate');
      world.guards.forEach(g => { g.speed = 2.6; if (g.npc.walker) g.npc.walker.speed = 2.6; g.rate = 44; });
      const timer = game.countdown(50, signal);
      const result = await Promise.race([
        world.waitForZone('serviceGate', signal).then(() => 'ok'),
        timer.expired.then(() => 'late'),
      ]);
      timer.stop();
      if (result === 'late') throw new MissionFail('The guards closed the perimeter.');
      game.suspicionHUD(false);
      world.setSuspicionSystem(false);
      audio.rain(false);
      await game.lines([['narrator', 'Behind her: alarms, dogs, fury. Ahead of her: one rooftop, one decision, one signal.']]);
    },
  },

  // ---------------------------------------------------------- M10: FINAL SIGNAL
  {
    loc: 'rooftop',
    music: 'sad',
    setup(ctx) {
      const { world, audio } = ctx;
      world.teleport(-10, 2.8, -1.15);
      audio.rain(true, 1.4);
      audio.siren(true);
    },
    async run(ctx) {
      const { game, world, ui, audio, signal } = ctx;
      phoneAdd('threats', { from: 'DSP Haris Qureshi', time: 'now', body: 'If you upload, I cannot protect you. If you run, I will not chase you. Choose well. — H.Q.' });
      phoneAdd('messages', { from: 'Sami Khan', time: 'now', body: 'zara they are TRIANGULATING you. you have minutes. whatever you do — do it NOW. (and then smash this phone, please)' });
      ui.phoneNotif(true);

      await game.lines([
        ['narrator', 'A rooftop above the old city. Rain. Sirens below. Mirza’s men on the stairs. Police at the gate.'],
        ['narrator', 'Everything she has — every name, every payment, every voice — is on one phone.'],
        ['zara', 'They want a quiet ending. Quiet endings are how this city stays sick.'],
      ]);

      game.obj('Reach the signal mast');
      await world.waitForZone('ledge', signal);
      audio.heartbeat(true);

      game.obj('Make the final decision');
      await game.lines([['narrator', 'The pink beacon blinks above her, steady as a pulse. One decision left.']]);
      const c = await game.choices([
        'Upload everything publicly',
        'Give the evidence to Rayyan',
        'Make a deal with Mirza',
        'Destroy the evidence and disappear',
        'Give the evidence to Mahnoor',
      ]);
      audio.heartbeat(false);

      const helped = getFlag('helpedAyan') || getFlag('gaveAyanNumber');
      const saved = getFlag('savedVoiceNote');
      let ending = 'dark';
      if (c === 0) {
        audio.sfx('upload');
        await game.lines([['zara', 'No editors. No middlemen. Everyone. At once.']]);
        ending = (helped && saved) ? 'good' : 'dark';
        if (ending === 'dark') {
          await game.lines([['narrator', 'The upload spread — but without the voice note, without a witness, it was just noise. And noise can be edited.']]);
        }
      } else if (c === 1) {
        await game.lines([
          ['zara', 'Rayyan. Cabinet seventeen taught me one thing — evidence survives when someone honest hides it.'],
          ['rayyan', 'Then give me everything. And Zara… run.'],
        ]);
        ending = (State.evidence.length >= 5) ? 'good' : 'dark';
        if (ending === 'dark') {
          await game.lines([['narrator', 'He fought with what little she gave him. It was not enough. The system ate the case, file by file.']]);
        }
      } else if (c === 2) {
        await game.lines([
          ['zara', 'You win, Senator. But the price went up. I keep the ledger. I keep the parties. I keep the Circle’s books.'],
          ['mirza', '…You finally learned the family business, Pinky.'],
        ]);
        ending = 'power';
      } else if (c === 3) {
        await game.lines([
          ['zara', 'No body. No story. No signal. Let them chase a ghost.'],
        ]);
        ending = (State.humanity >= 0 && !getFlag('deletedVoiceNote')) ? 'escape' : 'dark';
        if (ending === 'dark') {
          await game.lines([['narrator', 'But the city does not let its scapegoats simply vanish. They found a story for her absence — and made it ugly.']]);
        }
      } else {
        await game.lines([
          ['zara', 'Mahnoor. One story. The real one. All of it.'],
          ['mahnoor', 'Then stay alive long enough to read it.'],
        ]);
        ending = (getFlag('trustedMahnoor') || State.mahnoorTrust >= 2) ? 'good' : 'dark';
        if (ending === 'dark') {
          await game.lines([['narrator', 'But trust is built before midnight, not after. The story ran half-sourced — and was strangled by lunchtime.']]);
        }
      }
      setFlag('finalChoice', c);
      audio.siren(false);
      return ending;
    },
  },
];
