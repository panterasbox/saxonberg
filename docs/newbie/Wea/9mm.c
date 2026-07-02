//  9mm.c

inherit AmmoCode;


extra_create()
{
    set_name( "9mm bullet" );
    set_ids( ({"9mm","bullet"}) );
    set_short( "9mm bullet" );
    set_long( "This is a 9mm bullet." );
    set_ammo_type( "9mm" );
    set_value( 10 );
    set_weight( 1 );
    set_damage_type( "edged" );
    set_damage( 10, 25 );
}
