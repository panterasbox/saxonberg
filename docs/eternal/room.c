/*
#if defined(ITEM1) || defined(ITEM2) || defined(ITEM3) || defined(ITEM4) || defined(ITEM5) || defined(ITEM6) || defined(ITEM7) || defined(ITEM8) || defined(ITEM9) || defined(ITEM10)
*/
inherit RoomPlusCode;
/*
#else
inherit RoomCode;
#endif
*/
 
// #define CABALS "/zone/null/eternal/cabals/"
#define HOME   "/zone/null/eternal/"
 
void extra_create()
{
    seteuid( getuid() );
 
    set( "short", SHORT );
 
    set( "day_long", DAY_LONG );
    set( "day_light", DAY_LIGHT );
 
#ifdef NIGHT_LONG
   set( "night_long", NIGHT_LONG );
   set( "night_light", NIGHT_LIGHT );
#endif
 
   /* PROPERTIES */
#ifdef NOCOMBAT
    set( NoCombatP, 1 );
#endif
#ifdef NOPK
    set( NoPKP, 1 );
#endif
#ifdef NOSTEAL
    set( NoStealP, 1 );
#endif
#ifdef INSIDE
    set( InsideP, 1 );
#endif
#ifdef OUTSIDE
    set( OutsideP, 1 );
#endif
#ifdef UNDERGROUND
    set( UndergroundP, 1 );
#endif
#ifdef PATROL1
    set( "patrol1", PATROL1 );
#endif
#ifdef PATROL2
    set( "patrol2", PATROL2 );
#endif
#ifdef PATROL3
    set( "patrol3", PATROL3 );
#endif
#ifdef HEART
    set( "heart", HEART );
#endif
 
   /* MONSTERS */
#if defined(OBJ1) || defined(OBJ2) || defined(OBJ3) || defined(OBJ4) || defined(OBJ5) || defined(OBJ6) || defined(OBJ7) || defined(OBJ8) || defined(OBJ9) || defined(OBJ10)
    set( "reset_data", ([
#ifdef OBJ1
      "obj1" : OBJ1,
#endif
#ifdef OBJ2
      "obj2" : OBJ2,
#endif
#ifdef OBJ3
      "obj3" : OBJ3,
#endif
#ifdef OBJ4
      "obj4" : OBJ4,
#endif
#ifdef OBJ5
      "obj5" : OBJ5,
#endif
#ifdef OBJ6
      "obj6" : OBJ6,
#endif
#ifdef OBJ7
      "obj7" : OBJ7,
#endif
#ifdef OBJ8
      "obj8" : OBJ8,
#endif
#ifdef OBJ9
      "obj9" : OBJ9,
#endif
#ifdef OBJ10
      "obj10" : OBJ10,
#endif
     ]) );
#endif /* All OBJ[1-10] */
 
   /* EXITS */
#if defined(NEWZONE) || defined(NORTH) || defined(SOUTH) || defined(EAST) || defined(WEST) || defined(NORTHEAST) || defined(NORTHWEST) || defined(SOUTHEAST) || defined(SOUTHWEST) || defined(UP) || defined(DOWN)
    set( "exits", ([
#ifdef NEWZONE
      NEWZONE,
#endif
#ifdef NORTH
      "north": HOME + NORTH,
#endif
#ifdef SOUTH
      "south": HOME + SOUTH,
#endif
#ifdef EAST
      "east": HOME + EAST,
#endif
#ifdef WEST
      "west": HOME + WEST,
#endif
#ifdef NORTHEAST
      "northeast": HOME + NORTHEAST,
#endif
#ifdef NORTHWEST
      "northwest": HOME + NORTHWEST,
#endif
#ifdef SOUTHEAST
      "southeast": HOME + SOUTHEAST,
#endif
#ifdef SOUTHWEST
      "southwest": HOME + SOUTHWEST,
#endif
#ifdef UP
      "up": HOME + UP,
#endif
#ifdef DOWN
      "down": HOME + DOWN,
#endif
     ]) );
#endif /* All EXITS */
 
   /* ITEM DESCRIPTIONS */
#if defined(ITEM1) || defined(ITEM2) || defined(ITEM3) || defined(ITEM4) || defined(ITEM5) || defined(ITEM6) || defined(ITEM7) || defined(ITEM8) || defined(ITEM9) || defined(ITEM10)
    set( "descs", ([
#ifdef ITEM1
      ITEM1: ID1,
#endif
#ifdef ITEM2
      ITEM2: ID2,
#endif
#ifdef ITEM3
      ITEM3: ID3,
#endif
#ifdef ITEM4
      ITEM4: ID4,
#endif
#ifdef ITEM5
      ITEM5: ID5,
#endif
#ifdef ITEM6
      ITEM6: ID6,
#endif
#ifdef ITEM7
      ITEM7: ID7,
#endif
#ifdef ITEM8
      ITEM8: ID8,
#endif
#ifdef ITEM9
      ITEM9: ID9,
#endif
#ifdef ITEM10
      ITEM10: ID10,
#endif
     ]) );
#endif /* All ITEMS (descriptions) */

#ifdef MAP_HINT_X
    set( "map_hint_x", MAP_HINT_X );
#endif

#ifdef MAP_HINT_Y 
    set( "map_hint_y", MAP_HINT_Y );
#endif

#ifdef MAP_SYMBOL
    set( "map_symbol", MAP_SYMBOL );
#endif

#if defined(MAP_WEST_UNIT) || defined(MAP_EAST_UNIT) || defined(MAP_NORTH_UNIT) || defined(MAP_SOUTH_UNIT)
    set( "map_units", ([
#ifdef MAP_WEST_UNIT
        "west" : MAP_WEST_UNIT,
#endif
#ifdef MAP_EAST_UNIT
        "east" : MAP_EAST_UNIT,
#endif
#ifdef MAP_NORTH_UNIT
        "north" : MAP_NORTH_UNIT,
#endif
#ifdef MAP_SOUTH_UNIT
        "south" : MAP_SOUTH_UNIT,
#endif
    ]));
#endif  /* end map units  */

#if defined(MAP_EXTRA_WEST) || defined(MAP_EXTRA_EAST) || defined(MAP_EXTRA_NORTH) || defined(MAP_EXTRA_SOUTH)
    set( "map_extras", ([
#ifdef MAP_EXTRA_WEST
        "west" : MAP_EXTRA_WEST,
#endif
#ifdef MAP_EXTRA_EAST
        "east" : MAP_EXTRA_EAST,
#endif
#ifdef MAP_EXTRA_NORTH
        "north" : MAP_EXTRA_NORTH,
#endif
#ifdef MAP_EXTRA_SOUTH
        "south" : MAP_EXTRA_SOUTH,
#endif
    ]));
#endif  /* end map extras  */

}
 
#if defined(NOPK) || defined(NOCOMBAT) || defined(NOSTEAL)
nomask mixed query( string var )
{
#ifdef NOPK
    if ( var == NoPKP ) return 1;
#endif
#ifdef NOCOMBAT
    if ( var == NoCombatP ) return 1;
#endif
#ifdef NOSTEAL
    if ( var == NoStealP ) return 1;
#endif
    return ::query( var );
}
#endif
 
void extra_init()
{
  ::extra_init();
    if( THISP->query_aggressive() )
        destruct( THISP );
}
