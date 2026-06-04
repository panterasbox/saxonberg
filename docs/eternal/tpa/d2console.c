#include "/zone/null/toys/tpa/tpa.h"
inherit TPAConsole;

void
extra_create()
{
  set_departure("Eternal City 2");
  set_prices( ([ 
                 "Shrine" : 15,
                 "Crimson City" : 15,
                 "MoeTown" : 15,
                 "Disaster" : 15,
                 "Bracken" : 20,
                 "Aescbourne" : 20,
                 "Westport" : 20,
                 "Solace" : 20,
                 "Dyrathea" : 20,
              ]) );
  set_timetable( ([ 0 : ({ 300 }),
                    "Shrine"       : explode_minutes( 120,   0,  300 ) +
                                     explode_minutes( 120, 400, 2400 ),
                    "MoeTown"      : explode_minutes( 120,  15,  300 ) +
                                     explode_minutes( 120, 415, 2400 ),
                    "Disaster"     : explode_minutes( 120,  25,  300 ) +
                                     explode_minutes( 120, 425, 2400 ),
                    "Crimson City" : explode_minutes( 120,  40,  300 ) +
                                     explode_minutes( 120, 440, 2400 ),
                    "Dyrathea"     : explode_minutes( 120,  55,  300 ) +
                                     explode_minutes( 120, 455, 2400 ),
                    "Aescbourne"   : explode_minutes( 120, 105,  300 ) +
                                     explode_minutes( 120, 505, 2400 ),
                    "Bracken"      : explode_minutes( 120, 120,  300 ) +
                                     explode_minutes( 120, 520, 2400 ),
                    "Westport"     : explode_minutes( 120, 135,  300 ) +
                                     explode_minutes( 120, 535, 2400 ),
                    "Solace"       : explode_minutes( 120, 150,  300 ) +
                                     explode_minutes( 120, 550, 2400 )
                 ]) );
  room_setup("/zone/null/eternal/tpa/depart2");
  return;
} 

void
alarm_message( object station )
{
  ::alarm_message(station);
  if( objectp(station) )
    "/zone/null/eternal/tpa/station"->gate_signal(2, station->query_arrival());
  return;
}
