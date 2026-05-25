#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
  set("short", "Newbie Academy Regeneration Room");
  set("day_long", 
   "This is the regeneration room.  If you die in your adventures on EotL, "
   "regeneration rooms are the only place to bring your character back to "
   "life.  When you die, you lose 5% of your stats and some of your skills "
   "and proficiencies.  The primary regeneration room in the game is "
   "located just off of Tanelorn Road in Eternal City.  This is a location "
   "you should probably acquaint yourself with once you leave the relative "
   "safety of the Newbie Academy.  If you are dead and would like to come "
   "back to life, simply type <regenerate>."
  );
  set("day_light", 20);
  set( "night_light", 10);
  set( "exits", ([
    "west": ROOMS+"entrance",
   ]) );
  set( InsideP, 1 );
  set( NoCombatP, 1 );
  set(NoPKP, 1);
  set(NoTeleportInP, 1);
}

void extra_init()
{
   add_action("regenerate", "regenerate");
}

int regenerate(string arg)
{
   if (arg)
      return 0;
   if (!THISP->query_ghost()) 
   {
      write("But you aren't a ghost!\n");
      return 1;
  }
  THISP->make_me_alive();
  THISP->regenerate();
  return 1;
}
