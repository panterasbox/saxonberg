#include "../../defs.h"
inherit "../../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["lion" : MON+"lion",
        "lion2" : MON+"lion",
        "lioness" : MON+"lioness",
        "cub" : MON+"cub",
        "cub2" : MON+"cub"
      ]) );

   set("short","A Watering Hole");
   set( "day_long",
      "You look around and find yourself in the calm surroundings of the "
      "watering hole.  The watering hole is nothing more than a small "
      "pond where the local creatures can relax a litle bit and drink "
      "some water.  This corner of the pond seems to be where the lions "
      "hang out.  Looking around this room reminds you vaguely of the "
      "lessons you learned at newbie school.  Something on the edge "
      "of your mind says, \"search\".");
   set("descs", ([
      ({ "water", "hole", "watering hole", "pond" }) :
         "The watering hole is a relaxing place where the animals let "
         "their guard down slightly, but they'll still fight back if "
         "provoked.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
      "northwest":HOLE+"hole4",
      "south":HOLE+"hole2",
      ]) );
}

int search( string what )
{
   object dagger;
   object who;
   
   who = THISP;
   
   if(present( "lion dagger", who ))
   {
      return 0;
   }

   write( "You search the room, and find a dagger made from a lion's claw!\n" );
   dagger = clone_object( WEAPONS+"lion_dagger" );
   if( dagger )
   {
      move_object( dagger, who ); 
      return 1;
   }
   return 1;
}
