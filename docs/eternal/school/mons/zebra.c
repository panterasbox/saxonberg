inherit MonsterCode;

void extra_create()
{
   set_name( "zebra" );
   add_alias( ({"zebra", "monster"}) );
   set_short( "a zebra" );
   set_long(
      "This is a zebra.  It looks like a black and white striped horse. ");
   set_race( "animal" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 26 );
   set_stat( "int", 24 );
   set_stat( "wil", 25 );
   set_stat( "con", 27 );
   set_stat( "dex", 24 );
   set_stat( "chr", 25 );
   add_combat_message( "scratch", "scratches" );
   add_money(random(80));
}
