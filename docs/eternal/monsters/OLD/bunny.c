inherit MonsterCode;
inherit MonsterMove;
inherit MonsterPickUp;
inherit MonsterTalk;
 
void extra_create()
{
 
    object ob;
 
    set_name( "Energizer Bunny" );
    add_alias( "bunny" );
    set_race( "animal" );
    set_gender( "male" );
    set_short( "The Energizer Bunny" );
    set_long( "He just keeps going and going and going. . . " );
    set_alignment( "demonic" );
    set_toughness( 1 );
    add_prop( NoCombatP );

    set_chat_rate( 20 );
    set_chat_chance( 80 );
    add_phrase( "It just keeps going and going and going. . .\n" );
    add_phrase( "THUMP! THUMP! THUMP!\n" );

    set_move_rate( 30 );
    set_move_chance( 85 );

    set_pick_up_rate( 30 );
    set_pick_up_chance( 95 );

    ob = clone_object( "/zone/null/eternal/objects/battery" );
    move_object( ob, THISO );

}
