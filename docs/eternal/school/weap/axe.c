inherit NewWeaponCode;

void extra_create()
{
    set_ids( ({ "small axe", "axe" }) );
    set_short( "a small axe" );
    set_long(
      "This axe looks like it is generally used for chopping wood.  "
      "The edge is slightly dull from the work, but still sharp enough "
      "to cause serious damage to anyone on the receiving end" );
    set_material( "steel" );
    set_weight( 190 );
    set_value( 55 );
    set_base_damage( 5 + random(13) );
    set_damage_step( 11 );
    set_base_speed( 11 );
    set_speed_step( 8 );
    set_prof_mod( 2.5 );
    add_combat_message( ({ "chop", "chops" }) );
    set_proficiency( "light axe" );
    set_damage_type( "edged" );
    set_handed( 2 );
}
