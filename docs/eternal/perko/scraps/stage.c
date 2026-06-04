inherit RoomCode;
 
#include <ansi.h>
#include "path.h"
 
void extra_create()
{
  call_other( SHOP, "???" );
  set( "ansi_short", YEL + "On Stage at the Posh Perko Pit" );
  set( "short", "On Stage at the Posh Perko Pit" );
  set( "day_color", YEL );
  set( "day_long", 
    "A quick glance around lets you know that you are standing on "
    "a stage, essentially just a raised platform, in the Posh Perko Pit.  "
    "It is here that frustrated yet 'hip' poets can release their angst "
    "or whatever, to a properly 'fresh' and sympathetic audience.  Your "
    "vision of the off-stage portion of the coffee shop seems to be "
    "impaired by the blinding stage lights directed into your eyes.  "
    "You may step off of the stage to the south." );
  set( "invis_exits", ([
    "south" : "@off_stage",
    "shop" : "@off_stage",
    "down" : "@off_stage",
    ]) );
  set( "reset_data", ([ 
    "mic"  : BASIC "mic",
    "echo" : BASIC "stage_echo"
    ]) );
  set( "perm_exit_msg", "" );
  set( "day_light", 60 );
  set( InsideP, 1 );
}
 
off_stage()
{
  write( "You step off of the stage.\n" );
  tell_room( SHOP, PNAME + " steps down off of the stage.\n",
    ({ present( "echo", FINDO( SHOP ) ), THISP }) );
  tell_room( THISO, PNAME + " steps down off of the stage.\n",
    ({ present( "echo", THISO ), THISP }) );
  move_object( THISP, SHOP );
  command( "glance", THISP );
  return 1;
}
