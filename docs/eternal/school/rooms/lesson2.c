#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadBoard", "read" );
}

void extra_create()
{
   
   set("short", "Basic Directions Classroom");
   set("day_long",
     "This is a sparsely decorated classroom.  There are a couple of desks, "
     "a chalkboard at the front of the room, and harsh fluorescent lights overhead.");
   set( "descs", 
   ([  
      ({"chalkboard", "board" }) : "A chalkboard with writing on it.  Maybe you should <read> it.",
      ({ "desk", "desks" }) : "All these desks look the same, and they're all somehow "
         "just barely too small to fit into comfortably.  Someone has carved some "
         "graffiti into one of the desks, but you can't quite tell what it says from "
         "here.",
      "graffiti" : "h0j eats glue",
      ({ "lights", "fluorescent", "fluorescent lights" }) : "Ow, the lights hurt your "
         "eyes.  You look away before you scar your retinas."
   ]) );
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "east" : ROOMS+"lobby"
   ]) );
   
}


int ReadBoard( string arg )
{
   if( arg != "chalkboard" && arg != "board" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   write("GETTING AROUND EOTL\n\n\n");
   
   write("The basic directions (north, south, east, west, northwest, \n");
   write("northeast, southwest, southeast, up, and down) are used to\n");
   write("move your character from one room to another.  These \n");
   write("directions are already aliased for you as follows:\n\n");
 
   write("        'n'  for north           's'  for south\n");
   write("        'e'  for east            'w'  for west\n");
   write("        'nw' for northwest       'sw' for southwest\n");
   write("        'ne' for northeast       'se' for southeast\n");
   write("        'u'  for up              'd'  for down\n\n");

   return 1;

}

