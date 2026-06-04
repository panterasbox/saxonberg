inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "duck" );
   add_alias( ({"monster", "duck"}) );
   set_short( "A mallard duck" );
   set_long(
      "This is a mallard duck.  He seems rather out of place in a wheat "
      "field, but he doesn't seem too upset about it.");
   set_race( "duck" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "blunt" );
   set_stat( "str", 12 );
   set_stat( "int", 15 );
   set_stat( "wil", 17 );
   set_stat( "con", 13 );
   set_stat( "dex", 16 );
   set_stat( "chr", 10 );
   add_combat_message( "bite", "bites" );
   add_money(random(40));

   set_chat_chance( 85 );
   set_chat_rate( 15 );
   add_phrase( "#quack" );
   add_phrase( "#dance" );
}


