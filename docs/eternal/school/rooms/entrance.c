#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;
inherit DoorCode;

status WindowOpen;

void extra_init()
{
   add_action( "SearchMe", "search" );
   add_action( "ReadSign", "read" );
   add_action( "OpenWindow", "open" );
   add_action( "CloseWindow", "close" );
   add_action("do_quit", "quit");
}

void extra_create()
{
   set("reset_data", (["machine" : "/zone/null/toys/bin/machine" ]) );
   
   set("short", "Newbie School Entrance");
   set("day_long",
     "This is the entrance to the Newbie School.  This school is designed "
     "to help new players learn how to play EotL.  If you would like to "
     "skip newbie school and go straight to the EotL lounge, simply type "
     "<lounge> without the brackets and you will be transported.  There is "
     "a large maple door in the north wall that leads into the school.  "
     "There is a window in the east wall and a sign hangs from the ceiling.  "
     "If you <quit> from this room, it will be set as your start location, "
     "so the next time you log in, you will log in from here.\n"
     "(Tip: try typing <look window>, <look door>, and <look sign>) ");
   set( "descs", 
   ([ 
   "window" : "@Check_Window", 
   "sign" : "A sign hangs down from the ceiling.  Perhaps you could <read> it."
   ]) );
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([ "lounge" : LOUNGE, "east" : ROOMS+"regen", 
      "south" : ROOMS+"parking_lot" ]) );
   
   add_door( "north", ROOMS+"lobby", ROOMS+"door1" );

}

int SearchMe()
{
   object guide;
   object who;
   
   who = THISP;
   
   if(present( "guide", who ))
   {
      write( "You search the room, but find nothing.\n" );
      return 1;
   }

   write( "You search the room, and find a Guide to EotL!\n" );
   write( "Type <info> for more information about it.\n");
   guide = clone_object( "/zone/null/toys/guide/guide" );
   if( guide )
   {
      move_object( guide, who ); 
      return 1;
   }
   return 1;
   
}

int ReadSign( string arg )
{
   if( arg != "sign" )
   {
      notify_fail( "Read what?" );
      return 0;
   }
   
   write( "Sometimes rooms have more items in them than it first appears.\n" );
   write( "If you type <search>, sometimes these items become apparent.\n" );
   return 1;

}

int OpenWindow( string arg )
{
   
   object who;
   who = THISP;
   
   if( arg != "window" ) return 0;
   
   if( WindowOpen == 1)
   {
      notify_fail( "The window is already open!\n" );
      return 0;
   }

   WindowOpen = 1;
   write( "You open the window, and a refreshing breeze comes into the room.\n" );
   write( "The window seems to jam in the open position.\n" );
   tell_room(environment(who), PNAME+" opens a window.\n", ({who}) );
   return 1;
}

string Check_Window()
{
   if(WindowOpen == 0) {
      return "A closed window overlooks the entire MUD.  Perhaps you could <open> it.\n";
   }
   else {
      return "An open window overlooks the entire MUD.  You could try to <close> it.\n";
   }
}

int CloseWindow( string arg )
{
   
   object who;
   who=THISP;
   
   if( arg != "window" ) return 0;
   
   if( WindowOpen == 0 )
   {
      notify_fail( "The window is already closed.\n" );
      return 0;
   }
   
   write( "You try with all your might, but the window stays open.\n" );
   tell_room(environment(who), PNAME+" tries to close the window, but fails.\n", ({who}) );
   return 1;
}

status do_quit(string str) 
{
  THISP->set_start_loc(ROOMS+"entrance");
}
