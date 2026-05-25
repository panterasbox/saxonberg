// Devo 20131206
// TODO handle character deletions

#pragma no_clone
#pragma no_inherit
#pragma no_shadow

#include "condo.h"

#define INITIAL_UNIT       201
#define INITIAL_SERIAL     10001
#define SAVEFILE           CondoDir "/condos"

void create();
int new_unit(string owner);
int new_serial(int unit);
int query_unit(string owner);
int query_next_unit();
private void increment_next_unit();
int query_serial(int unit);
int query_next_serial();
private void increment_next_serial();
int query_floors();
int query_floor(int unit);
object query_landing(int floor);

// ([ unit : serial ])
mapping serials;

// ([ owner : unit ])
mapping units;

// ([ floor : landing ])
nosave mapping landings;

int next_unit, next_serial;

void create() {
  seteuid(getuid());
  serials = ([ ]);
  units = ([ ]);
  landings = ([ ]);
  next_unit = INITIAL_UNIT;
  next_serial = INITIAL_SERIAL;
  if (!restore_object(SAVEFILE)) {
    save_object(SAVEFILE);
  }
}

/**
  * Create a new unit and assign it to the specified owner. Owner must not
  * already own a unit.
  *
  * @param owner the uid of the new unit's owner
  * @return the unit number of the newly added unit, or -1 if unit could not
  *         be added
  */
int new_unit(string owner) {
  if (member(units, owner)) {
    return -1;
  }
  units[owner] = next_unit;
  increment_next_unit();
  serials[units[owner]] = next_serial;
  increment_next_serial();
  save_object(SAVEFILE);
  return units[owner];
}

/**
  * Assign a new keycard serial number to the specified unit.
  * 
  * @param the unit number for which to assign serial
  * @return the new serial number, or -1 if serial could not be assigned
  */
int new_serial(int unit) {
  serials[unit] = next_serial;
  increment_next_serial();
  save_object(SAVEFILE);
  return serials[unit];
}

int query_unit(string owner) {
  if (member(units, owner)) {
    return units[owner];
  } else {
    return -1;
  }
}

int query_next_unit() {
  return next_unit;
}

private void increment_next_unit() {
  if ((next_unit % FLOOR_MULTIPLIER) >= UNITS_PER_FLOOR) {
    next_unit = (((next_unit / FLOOR_MULTIPLIER) + 1) * 100) + 1;
  } else {
    next_unit++;
  }
}

int query_serial(int unit) {
  if (member(serials, unit)) {
    return serials[unit];
  } else {
    return -1;
  }
}

int query_next_serial() { 
  return next_serial;
}

private void increment_next_serial() {
  next_serial++;
}

int query_floors() {
  int floor = query_floor(next_unit);
  if ((next_unit % FLOOR_MULTIPLIER) == 1) {
    floor--;
  }
  return floor;
}

int query_floor(int unit) {
  return unit / FLOOR_MULTIPLIER;
}

object query_landing(int floor) {
  if ((floor < query_floor(INITIAL_UNIT)) || (floor > query_floors())) {
    return 0;
  }
  object landing = landings[floor];
  if (!landing) {
    landing = clone_object(Landing);
    landing->setup_landing(floor);
  }
  return landing;
}
