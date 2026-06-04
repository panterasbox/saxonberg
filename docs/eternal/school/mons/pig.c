inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "pig" );
   add_alias( ({"monster", "pig"}) );
   set_short( "A pig" );
   set_long(
      "This is a pig.  He is round and plump and looks good enough to eat.");
   set_race( "animal" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 13 );
   set_stat( "int", 14 );
   set_stat( "wil", 17 );
   set_stat( "con", 14 );
   set_stat( "dex", 19 );
   set_stat( "chr", 10 );
   add_combat_message( "bite", "bites" );
   add_money(random(40));

   set_chat_chance( 85 );
   set_chat_rate( 15 );
   add_phrase( "#oink" );
   add_phrase( "#snort" );
}


