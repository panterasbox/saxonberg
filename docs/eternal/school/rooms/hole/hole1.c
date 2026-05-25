#include "../../defs.h"
inherit "../../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","A Watering Hole");
   set( "day_long",
      "You look around and find yourself in the calm surroundings of the "
      "watering hole.  The path is completely blocked to the east and the "
      "south, other than a small path heading back to the farm.  The watering "
      "hole itself is to the northwest, and it seems as though you can walk "
      "around the perimeter of this small pond.");
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
      "north":HOLE+"hole2",
      "west":HOLE+"hole9",
      "southeast":ROOMS+"path",
      ]) );
}
