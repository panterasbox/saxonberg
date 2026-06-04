// Devo 20131216
inherit RoomCode;

#include "condo.h"

void extra_create();
void extra_init();
int do_press(string arg);
void setup_landing(int f);

int floor;
object north_hallway, south_hallway;

void extra_create() {
  set( "short", "Eternal Arms Interdimensional Condominiums" );
  set( "long", "This is where the elevator dumps you." );
  set( "day_light", WELL_LIT );
  set( InsideP , 1 );
  set( NoCombatP, 1 );
  set( NoMagicP, 1 );
  set( "descs", ([
    ({ "door", "doors", "elevator door", "elevator doors" }) : 
    "",
    ({ "panel", "elevator panel" }) :
    ""
  ]) );
  set( "exits", ([ "north" : "@query_hallway",
                   "south" : "@query_hallway" ]) );
  floor = 0;
  north_hallway = 0;
  south_hallway = 0;
}

void extra_init() {
  add_action("do_press", "press");
}

int do_press(string arg) {
  arg = lower_case(arg);
  int button, target_floor;
  if (member( ([ "button", "elevator button" ]), arg )) {
    tell_player(THISP, "Which button do you want to press?");
    return 1;
  }
  if (member( ([ "up button", "up" ]), arg )) {
    if (floor > CondoServer->query_floors()) {
      tell_player(THISP, "You're already on the top floor!");
      return 1;
    }
    button = BUTTON_UP;
  } else if (member( ([ "down button", "down" ]), arg )) {
    if (floor < 1) {
      tell_player(THISP, "You're already on the bottom floor!");
      return 1;
    }
    button = BUTTON_DOWN;
  } else {
    notify_fail("Press what?\n");
    return 0;
  }
  
  Elevator->add_stop(floor, button);
  return 1;
}

void setup_landing(int f) {
  floor = f;
  set( "short", sprintf(
    "Eternal Arms Interdimensional Condominiums, %s Floor", to_string(floor)
  ) );
  set( "long", "" );
}

string query_hallway(string dir) {
    if (dir == "north") {
        if (!north_hallway) {
            north_hallway = clone_object(Hallway);
            north_hallway->setup_hallway(floor, WING_NORTH);
        }
        return object_name(north_hallway);
    } else if (dir == "south") {
        if (!south_hallway) {
            south_hallway = clone_object(Hallway);
            south_hallway->setup_hallway(floor, WING_SOUTH);
        }
        return object_name(south_hallway);
    } else {
        return 0;
    }
}
