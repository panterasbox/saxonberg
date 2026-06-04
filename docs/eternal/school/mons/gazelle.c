inherit MonsterCode;

void extra_create()
{
   set_name( "gazelle" );
   add_alias( ({"gazelle", "monster"}) );
   set_short( "a gazelle" );
   set_long(
      "This is a Thomson's gazelle.  It resembles a small deer with a black "
      "stripe running the length of its body.");
   set_race( "animal" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 28 );
   set_stat( "int", 24 );
   set_stat( "wil", 25 );
   set_stat( "con", 27 );
   set_stat( "dex", 28 );
   set_stat( "chr", 25 );
   add_combat_message( "scratch", "scratches" );
   add_money(random(90));
}
