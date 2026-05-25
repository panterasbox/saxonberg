// Devo 20131216
inherit RoomCode;

#include "condo.h"

void extra_create();
void setup_hallway(int f, int wing);
int exit_to_unit(string dir);
string query_next_hallway(string dir);
int query_unit(string dir);
int query_floor();
int query_wing();

object next_hallway;

// ([ dir : unit ])
mapping units;

int floor, wing;

void extra_create() {
  set( "short", "Eternal Arms Interdimensional Condominiums" );
  set( "long", "Clone a bunch of these to make up the hallways." );
  set( "day_light", WELL_LIT );
  set( InsideP , 1 );
  set( NoCombatP, 1 );
  set( NoMagicP, 1 );
  floor = 0;
  wing = 0;
  next_hallway = 0;
  units = ([ ]);
}

/*
 * If there are an odd number of unit per hallway, the south wing gets the
 * extra unit. If there are an odd number of units in a given wing, the last
 * section of hallway will have an extra unit exit in the forward direction
 * of the wing.
 *
 * @param f the floor number on which to setup this section of hallway
 * @param w an int designating which wing of the hallway this section
 *          belongs to
 */
void setup_hallway(int f, int w) {
  floor = f;
  wing = w;

  // figure out where this section of hallway this is, and the starting and
  // ending units for this wing of the hallway. if
  int initial_unit;
  string forward_dir, backward_dir;
  if (wing == WING_NORTH) {
    initial_unit = (floor * FLOOR_MULTIPLIER) + 1;
    forward_dir = "north";
    backward_dir = "south";
  } else {
    initial_unit = (floor * FLOOR_MULTIPLIER) + (UNITS_PER_FLOOR / 2) + 1;
    forward_dir = "south";
    backward_dir = "north";
  }
  object landing = CondoServer->query_landing(floor);
  object previous_hallway = landing;
  object this_hallway = landing;
  int hallway_index = -1;
  while (this_hallway && (this_hallway != THISO)) {
    previous_hallway = this_hallway;
    this_hallway = FINDO(this_hallway->query_exit(forward_dir));
    hallway_index++;
  }
  int last_unit = initial_unit + (UNITS_PER_FLOOR / 2) - 1;

  // setup exits and units
  add( "exits", ([ backward_dir : object_name(previous_hallway) ]) );
  int this_unit = initial_unit + (hallway_index * 2);
  if (this_unit > 0) {
    if (this_unit <= last_unit) {
      units["west"] = this_unit;
      add( "exits", ([ "west" : "@exit_to_unit" ]) );
      this_unit++;
    }
    if (this_unit <= last_unit) {
      units["east"] = this_unit;
      add( "exits", ([ "east" : "@exit_to_unit" ]) );
      this_unit++;
    }
    if (this_unit == last_unit) {
      units[forward_dir] = this_unit;
      add( "exits", ([ forward_dir : "@exit_to_unit" ]) );
      this_unit++;
    } else if (this_unit < last_unit) {
      add( "exits", ([ forward_dir : "@query_next_hallway" ]) );
    }
  }

  // setup descriptions
  set( "short", sprintf(
    "Eternal Arms Interdimensional Condominiums, %s Floor", to_string(floor)
  ) );
  set( "long", "" );
}

int exit_to_unit(string dir) {
  int unit = query_unit(dir);
  if (!unit) {
    return 0;
  }
  object *keycards = filter_array(all_inventory(THISP), 
    (: (load_name($1) == Keycard) && ($1->query_unit() == $2) :), unit);
  if (!sizeof(keycards)) {
    tell_player(THISP, "You must have the proper keycard to enter.");
  } else if (!sizeof(filter_array(keycards, 
    (: $1->query_serial() == $2 :), CondoServer->query_serial(unit)))) {
    tell_player(THISP, 
      "You swipe your keycard but nothing happens. Someone must have changed "
      "the locks.");
  } else {
    tell_player(THISP, "You enter.");
  }
  return 1;
}

string query_next_hallway(string dir) {
  if (!next_hallway) {
    next_hallway = clone_object(Hallway);
    next_hallway->setup_hallway(floor, wing); 
  }
  return object_name(next_hallway);
}

int query_unit(string dir) {
  return units[dir];
}

int query_floor() {
  return floor;
}

int query_wing() {
  return wing;
}
