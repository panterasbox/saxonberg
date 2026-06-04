inherit ObjectCode;
#include "../defs.h"
#include <ansi.h>
#define BALLOONROOM ROOMS "balloon"

void extra_create()
{
   set("ansi_short", HIY"Newbie Academy Balloon"NORM);
   set("short", "Newbie Academy Balloon");
   set("id", "balloon");
   set("long",
     "This is the Newbie Academy Balloon, providing transportation between "
     "the EotL Lounge and the EotL Newbie Academy.  If you'd like to take "
     "a ride, go ahead and <climb in>.");
   set("gettable", 0);
   clone_object( BALLOONROOM );
   BALLOONROOM->SetBalloonObject(THISO);
   
}

void extra_init()
{
   add_action( "MoveMeThere", "climb" );
}

status MoveMeThere(string where)
{
   object who;
   who = THISP;
   
   if(where != "in")
   {
      notify_fail("Climb where?\n");
      return 0;
   }
   
  if(who->query_eval() > 6.0 && !IsWizard(who) )
   {
      tell_object(who, "You're too big to go to Newbie School!\n");
      return 1;
   }
   
   tell_object(who, 
      "You climb into the Newbie Academy Balloon.\n");
   tell_room(ENV(who), CAP(PRNAME)+" climbs into the Newbie Academy "
      "Balloon.\n",({who}));
   BALLOONROOM->SetStart(load_name(ENV(who)));
   move_object(who, BALLOONROOM);
   who->glance();
   return 1;
}
