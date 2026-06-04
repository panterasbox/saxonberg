inherit MonsterCode;
inherit MonsterMove;
#include "../defs.h"


void extra_create()
{
   set_name( "hyena" );
   add_alias( ({"hyena", "monster"}) );
   set_short( "a mangy hyena" );
   set_long(
      "This is a mangy hyena.  It wanders around the watering hole hoping "
      "to scavenge bits and pieces of food.  While it is not aggressive, "
      "it will certainly fight back with vigor if attacked. ");
   set_race( "animal" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 25 );
   set_stat( "int", 24 );
   set_stat( "wil", 25 );
   set_stat( "con", 25 );
   set_stat( "dex", 22 );
   set_stat( "chr", 25 );
   add_combat_message( "scratch", "scratches" );
   add_money(random(75));
   
   set_move_rate( 15 );
   set_move_chance( 40 );
   set_wander_dir( ({ HYENA_WANDER }) );
   

}
