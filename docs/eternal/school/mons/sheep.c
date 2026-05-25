inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "sheep" );
   add_alias( ({"monster", "sheep"}) );
   set_short( "A sheep" );
   set_long(
      "This is a sheep.  It looks so cute and cuddly, you just want to "
      "take it home and make it your own pet.");
   set_race( "creature" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 15 );
   set_stat( "int", 11 );
   set_stat( "wil", 13 );
   set_stat( "con", 11 );
   set_stat( "dex", 17 );
   set_stat( "chr", 10 );
   add_combat_message( "bite", "bites" );
   add_money(random(40));

   set_chat_chance( 85 );
   set_chat_rate( 15 );
   add_phrase( "#baa" );
   add_phrase( "#sheepish" );
   add_phrase( "#sheep" );
}


