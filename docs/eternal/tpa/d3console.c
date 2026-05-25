#include "/zone/null/toys/tpa/tpa.h"
inherit TPAConsole;

void
extra_create()
{
  set_departure("Eternal City 3");
  set_prices( ([ "Third War of Nacosin" : 50 ]) );
  set_timetable( ([ 0 : ({ 400 }),
                    "Third War of Nacosin": ({ 500 }) ]) );
  room_setup("/zone/null/eternal/tpa/depart3");
  return;
} 

void
alarm_message( object station )
{
  ::alarm_message(station);
  if( objectp(station) )
    "/zone/null/eternal/tpa/station"->gate_signal(3, station->query_arrival());
  return;
}
