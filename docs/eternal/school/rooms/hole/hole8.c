#include "../../defs.h"
inherit "../../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["gazelle" : MON+"gazelle",
        "gazelle2" : MON+"gazelle",
        "gazelle3" : MON+"gazelle"
      ]) );
   set("short","A Watering Hole");
   set( "day_long",
      "You look around and find yourself in the calm surroundings of the "
      "watering hole.  The watering hole is nothing more than a small "
      "pond where the local creatures can relax a litle bit and drink "
      "some water.  This corner of the pond seems to be where the gazelle "
      "hang out.");
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
      "northwest":HOLE+"hole7",
      "east":HOLE+"hole9",
      ]) );
}
