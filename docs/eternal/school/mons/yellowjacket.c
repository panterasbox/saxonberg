inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "yellowjacket" );
   add_alias( ({"yellowjacket", "angry", "monster"}) );
   set_short( "An angry yellowjacket" );
   set_long(
      "A yellowjacket flies around here, wondering why you are bothering "
      "him.  It looks like he doesn't like being bothered. ");
   set_race( "winged_insect" );
   set_gender( "male" );
   set_aggressive( 1 );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 13 );
   set_stat( "int", 7 );
   set_stat( "wil", 12 );
   set_stat( "con", 12 );
   set_stat( "dex", 14 );
   set_stat( "chr", 20 );
   add_combat_message( "sting", "stings" );

   set_chat_chance( 30 );
   set_chat_rate( 30 );
   add_phrase( "A yellowjacket buzzes angrily." );
   add_combat_phrase( "A yellowjacket wishes you would buzz off." );
}


