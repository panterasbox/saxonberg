inherit MonsterMobCode;
#include <ansi.h>


void extra_create()
{
   set_name( "lioness" );
   set_defend_type( "lions" );
   add_alias( ({"lioness", "monster"}) );
   set_short( "a lioness" );
   set_long(
      "This is a female lion.  She is almost as big as a male lion, and "
      "in reality does most of the hard work. ");
   set_race( "animal" );
   set_gender( "female" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 28 );
   set_stat( "int", 24 );
   set_stat( "wil", 25 );
   set_stat( "con", 26 );
   set_stat( "dex", 24 );
   set_stat( "chr", 25 );
   add_money(random(70));
   add_combat_message( "scratch", "scratches" );   
/*
   set_defend_message( "A lioness jumps to the defense of her cub!" );
   set_defend_color( HIY ); 
*/
}
