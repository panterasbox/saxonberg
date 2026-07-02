#include "/zone/null/toys/tpa/tpa.h"
inherit TPAConsole;

void
extra_create()
{
  set_departure("Newbieland");
  set_arrival("Newbieland");
  set_schedule("NL");
  set_prices( ([ "Eternal City" : 4,
                 "Citadel" : 6 ]) );
//  set_timetable( ([ 0: ({ 0 }) ]) );
  set_toggle( ({ "Eternal City", "Citadel" }) );
  room_setup("/zone/fantasy/genious/newbie/wall");
  replace_program(TPAConsole);
  return;
} 
