/**
 * ContactsMixin tests — flat-set CRUD, label-derived views, rename/clear.
 */

import { describe, it, expect } from 'vitest';
import { ContactsMixin, type ContactEntry } from '../Contacts';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

class ContactsOwner extends ContactsMixin(Idea) {}

function avatarEntry(playerId: string, label: string): ContactEntry {
  return {
    kind: 'avatar',
    playerId,
    label,
    source: 'self',
    addedAt: 1000,
  };
}

function npcEntry(templatePath: string, label: string): ContactEntry {
  return {
    kind: 'npc',
    templatePath,
    label,
    source: 'self',
    addedAt: 1000,
  };
}

describe('ContactsMixin', () => {
  it('add stores an entry; allContacts surfaces it', () => {
    const o = makeStuff(() => new ContactsOwner());
    expect(o.addContact(avatarEntry('iffy', 'friend'))).toBe(true);
    expect(o.allContacts()).toHaveLength(1);
    expect(o.allContacts()[0]).toMatchObject({
      kind: 'avatar',
      playerId: 'iffy',
      label: 'friend',
    });
  });

  it('add returns false on duplicate', () => {
    const o = makeStuff(() => new ContactsOwner());
    expect(o.addContact(avatarEntry('iffy', 'friend'))).toBe(true);
    expect(o.addContact(avatarEntry('iffy', 'friend'))).toBe(false);
    expect(o.allContacts()).toHaveLength(1);
  });

  it('contactsByLabel filters', () => {
    const o = makeStuff(() => new ContactsOwner());
    o.addContact(avatarEntry('iffy', 'friend'));
    o.addContact(avatarEntry('bobalu', 'friend'));
    o.addContact(avatarEntry('zelle', 'ignore'));
    expect(o.contactsByLabel('friend')).toHaveLength(2);
    expect(o.contactsByLabel('ignore')).toHaveLength(1);
    expect(o.contactsByLabel('nope')).toHaveLength(0);
  });

  it('remove drops a specific entry', () => {
    const o = makeStuff(() => new ContactsOwner());
    o.addContact(avatarEntry('iffy', 'friend'));
    o.addContact(avatarEntry('bobalu', 'friend'));
    expect(o.removeContact('avatar', 'iffy', 'friend')).toBe(true);
    expect(o.allContacts()).toHaveLength(1);
    expect(o.removeContact('avatar', 'iffy', 'friend')).toBe(false);
  });

  it('contactLabels returns distinct labels, sorted', () => {
    const o = makeStuff(() => new ContactsOwner());
    o.addContact(avatarEntry('iffy', 'friend'));
    o.addContact(avatarEntry('z', 'study'));
    o.addContact(avatarEntry('a', 'friend'));
    expect(o.contactLabels()).toEqual(['friend', 'study']);
  });

  it('clear drops every entry of a label', () => {
    const o = makeStuff(() => new ContactsOwner());
    o.addContact(avatarEntry('iffy', 'friend'));
    o.addContact(avatarEntry('bobalu', 'friend'));
    o.addContact(avatarEntry('zelle', 'ignore'));
    expect(o.clearContactLabel('friend')).toBe(2);
    expect(o.allContacts()).toHaveLength(1);
    expect(o.contactsByLabel('friend')).toHaveLength(0);
  });

  it('rename relabels every matching entry', () => {
    const o = makeStuff(() => new ContactsOwner());
    o.addContact(avatarEntry('iffy', 'friend'));
    o.addContact(avatarEntry('bobalu', 'friend'));
    o.addContact(avatarEntry('zelle', 'ignore'));
    expect(o.renameContactLabel('friend', 'pal')).toBe(2);
    expect(o.contactsByLabel('pal')).toHaveLength(2);
    expect(o.contactsByLabel('friend')).toHaveLength(0);
    expect(o.contactsByLabel('ignore')).toHaveLength(1);
  });

  it('npc entries co-exist with avatar entries on the same label', () => {
    const o = makeStuff(() => new ContactsOwner());
    o.addContact(avatarEntry('iffy', 'friend'));
    o.addContact(npcEntry('/obj/npc/Gus', 'friend'));
    expect(o.contactsByLabel('friend')).toHaveLength(2);
  });
});
