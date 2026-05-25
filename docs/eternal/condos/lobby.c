inherit RoomPlusCode;

#include "condo.h"

void extra_create();
void update_long();
void extra_init();
int do_press(string arg);

void extra_create() {
  set( "short", "Eternal Arms Interdimensional Condominiums, Lobby" );
  ClockObject->set_alarm("update_long", "spring");
  ClockObject->set_alarm("update_long", "summer");
  ClockObject->set_alarm("update_long", "fall");
  ClockObject->set_alarm("update_long", "winter");
  update_long();
  set( "day_light", WELL_LIT );
  set( "exits", ([ "south" : CondoDir "/office" ]) );
  set( InsideP, 1 );
  set( NoCombatP, 1 );
  set( NoMagicP, 1 );
  set( "descs", ([
    ({ "elevator" }) : 
    "",
    ({ "panel", "elevator panel" }) : 
    "",
    ({ "button", "elevator button" }) :
    ""
  ]) );
}

void update_long() {
  set( "day_long", "" );
  set( "night_long", "" );
}

void extra_init() {
  add_action("do_press", "press");  
}

int do_press(string arg) {
  arg = lower_case(arg);
  if (arg == "down button") {
    tell_player(THISP, "You're already on the bottom floor!");
    return 1;
  }
  if (!member( ([ "button", "elevator button", "up button" ]), arg )) {
    notify_fail("Press what?\n");
    return 0;
  }
  Elevator->add_stop(1, BUTTON_UP);
  return 1;
}
