inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "hen" );
   add_alias( ({"monster", "hen", "rhode island red", "Rhode Island Red"}) );
   set_short( "A Rhode Island Red hen" );
   set_long(
      "This is a Rhode Island Red hen.  Bred to be a prizewinner, she looks "
      "like a real beauty. ");
   set_race( "bird" );
   set_gender( "female" );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 12 );
   set_stat( "int", 11 );
   set_stat( "wil", 12 );
   set_stat( "con", 11 );
   set_stat( "dex", 12 );
   set_stat( "chr", 11 );
   add_combat_message( "peck", "pecks" );
   add_money(random(40));

   set_chat_chance( 75 );
   set_chat_rate( 15 );
   add_phrase( "#bawk" );
   add_phrase( "#peck" );
}


