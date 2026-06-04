inherit ObjectCode;

void extra_create();
int query_unit();
void set_unit(int u);
int query_serial();
void set_serial(int s);

int unit, serial;

void extra_create() {
  set( "id", ({ "keycard", "eternal arms keycard", "card", "key" }) );
  set( "short", "an Eternal Arms keycard" );
  set( "long", "" );
  set( "gettable", 1 );
  set( "droppable", 1 );
  set( "value", 10 );
  set( "weight", 1 );
  set( "descs", ([
    ({ "" }) : 
    ""
  ]) );
  unit = 0;
  serial = 0;
}

int query_unit() {
  return unit;
}

void set_unit(int u) {
  unit = u;
}

int query_serial() {
  return serial;
}

void set_serial(int s) {
  serial = s;
}

