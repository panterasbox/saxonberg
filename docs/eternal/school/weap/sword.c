inherit NewWeaponCode;

void extra_create()
{
    set_ids( ({ "short sword", "sword" }) );
    set_short( "a short sword" );
    set_long(
      "This sword is no more than a dagger with a double-edged "
      "blade so long that it can no longer be considered "
      "a dagger.  It can be easily held with one hand, but "
      "be careful with it, as it looks very sharp!" );
    set_material( "iron" );
    set_weight( 180 );
    set_value( 60 );
    set_base_damage( 9 + random(5) );
    set_damage_step( 13 );
    set_base_speed( 12 );
    set_speed_step( 6 );
    set_prof_mod( 1.5 );
    add_combat_message( ({ "slice", "slices" }));
    set_proficiency( "light sword" );
    set_damage_type( "edged" );
}
