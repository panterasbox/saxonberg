inherit AmmoCode;

void extra_create()
{
   set_ids( ({ "bb", "BB" }) );
   set_short( "small metal bb" );
   set_long( "This is a small metal bb.  It will work in any BB gun." );
   set_damage( 3, 10 );
   set_ammo_type( "bb" );
   set_damage_type( "piercing" );
}
