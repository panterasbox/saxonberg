#include "/zone/null/toys/tpa/tpa.h"
inherit TPAConsole;

void
extra_create()
{
  set_departure("Eternal City 1");
  set_prices( ([ "Newbieland" : 4,
                 "Citadel" : 4 ]) );
  set_timetable( ([ 0 : ({ 200 }),
                    "Newbieland" : explode_minutes( 60, 0, 200 ) +
                                   explode_minutes( 60, 300, 2400 ),
                    "Citadel" : explode_minutes( 60, 30, 200 ) +
                                explode_minutes( 60, 330, 2400 ) 
                 ]) );
  room_setup("/zone/null/eternal/tpa/depart1");
  return;
} 

void
alarm_message( object station )
{
  ::alarm_message(station);
  if( objectp(station) )
    "/zone/null/eternal/tpa/station"->gate_signal(1, station->query_arrival());
  return;
}
