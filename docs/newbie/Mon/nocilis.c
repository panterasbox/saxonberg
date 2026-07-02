/*
**  Valentino 1/7/04
*/


#define OBJDIR "/zone/fantasy/genious/newbie/Obj/"

inherit MonsterCode;

void extra_create()
{
    string *equip;
    object o, *obs;

    set_gender( "male" );
    set_name( "Nocilis" );
    set_short( "Nocilis whittles wood to pass the time" );
    add_alias( "nocilis" );
    set_long(
       "Despite his thick muscles and deadly blade, Nocilis wears a warm smile.  He is the strongest and "
       "most skilled -- with weapons -- member of Rainbow Village.  You get the impression that fighting this "
       "man would be a painful battle."
    );
    set_race( "human" );
    set_natural_ac( 6 );
    set_alignment( GOOD_AL );
    set_stat( "str", 30 );
    set_stat( "int", 20 );
    set_stat( "wil", 25 );
    set_stat( "con", 35 );
    set_stat( "dex", 32 );
    set_stat( "chr", 15 );
    set_skill( "dodge", 20 );
    set_proficiency( "knife", 20 );
    set_percent_bonus_exp(250);
    add_money( 75 + random( 150 ) );

    if( clonep() )
    {
        equip = ({
          OBJDIR + "ornate_knife",
          ARMORDIR + "breastplates/bronze_plate_breastplate",
          ARMORDIR + "helmets/great_helm",
          ARMORDIR + "sleeves/plate_sleeves",
          ARMORDIR + "leggings/plate_leggings",
          ARMORDIR + "gauntlets/plate_gauntlets",
          ARMORDIR + "boots/plate_boots"
        });
        map( (obs = map( equip, #'clone_object )), #'move_object, THISO );
        foreach( o : filter_objects( obs, "query", ArmorP ) )
          wear_armor(o);
        wield_weapon(present("knife",THISO));
    }
}

void extra_init()
{
    if( is_player(THISI) )
        command("say Hullo there, friend!  Whut can I do ya fer?");
}

