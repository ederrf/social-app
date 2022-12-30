import React from 'react'
import {ScrollView, View} from 'react-native'
import {ViewHeader} from '../com/util/ViewHeader'
import {ThemeProvider} from '../lib/ThemeContext'
import {PaletteColorName} from '../lib/ThemeContext'
import {usePalette} from '../lib/hooks/usePalette'

import {Text} from '../com/util/text/Text'
import {ViewSelector} from '../com/util/ViewSelector'
import {EmptyState} from '../com/util/EmptyState'
import * as LoadingPlaceholder from '../com/util/LoadingPlaceholder'
import {Button} from '../com/util/forms/Button'
import {DropdownButton, DropdownItem} from '../com/util/forms/DropdownButton'
import {ToggleButton} from '../com/util/forms/ToggleButton'
import {RadioGroup} from '../com/util/forms/RadioGroup'
import {ErrorScreen} from '../com/util/error/ErrorScreen'
import {ErrorMessage} from '../com/util/error/ErrorMessage'

const MAIN_VIEWS = ['Base', 'Controls', 'Error']

export const Debug = () => {
  const [colorScheme, setColorScheme] = React.useState<'light' | 'dark'>(
    'light',
  )
  const onToggleColorScheme = () => {
    setColorScheme(colorScheme === 'light' ? 'dark' : 'light')
  }
  return (
    <ThemeProvider theme={colorScheme}>
      <DebugInner
        colorScheme={colorScheme}
        onToggleColorScheme={onToggleColorScheme}
      />
    </ThemeProvider>
  )
}

function DebugInner({
  colorScheme,
  onToggleColorScheme,
}: {
  colorScheme: 'light' | 'dark'
  onToggleColorScheme: () => void
}) {
  const [currentView, setCurrentView] = React.useState<number>(0)
  const pal = usePalette('default')

  const renderItem = item => {
    return (
      <View>
        <View style={{paddingTop: 10, paddingHorizontal: 10}}>
          <ToggleButton
            type="default-light"
            onPress={onToggleColorScheme}
            isSelected={colorScheme === 'dark'}
            label="Dark mode"
          />
        </View>
        {item.currentView === 2 ? (
          <ErrorView key="error" />
        ) : item.currentView === 1 ? (
          <ControlsView key="controls" />
        ) : (
          <BaseView key="base" />
        )}
      </View>
    )
  }

  const items = [{currentView}]

  return (
    <View style={[{flex: 1}, pal.view]}>
      <ViewHeader title="Debug panel" />
      <ViewSelector
        swipeEnabled
        sections={MAIN_VIEWS}
        items={items}
        renderItem={renderItem}
        onSelectView={setCurrentView}
      />
    </View>
  )
}

function Heading({label}: {label: string}) {
  const pal = usePalette('default')
  return (
    <View style={{paddingTop: 10, paddingBottom: 5}}>
      <Text type="h3" style={pal.text}>
        {label}
      </Text>
    </View>
  )
}

function BaseView() {
  return (
    <View style={{paddingHorizontal: 10}}>
      <Heading label="Palettes" />
      <PaletteView palette="default" />
      <PaletteView palette="primary" />
      <PaletteView palette="secondary" />
      <PaletteView palette="inverted" />
      <PaletteView palette="error" />
      <Heading label="Typography" />
      <TypographyView />
      <Heading label="Empty state" />
      <EmptyStateView />
      <Heading label="Loading placeholders" />
      <LoadingPlaceholderView />
      <View style={{height: 200}} />
    </View>
  )
}

function ControlsView() {
  return (
    <ScrollView style={{paddingHorizontal: 10}}>
      <Heading label="Buttons" />
      <ButtonsView />
      <Heading label="Dropdown Buttons" />
      <DropdownButtonsView />
      <Heading label="Toggle Buttons" />
      <ToggleButtonsView />
      <Heading label="Radio Buttons" />
      <RadioButtonsView />
      <View style={{height: 200}} />
    </ScrollView>
  )
}

function ErrorView() {
  return (
    <View style={{padding: 10}}>
      <View style={{marginBottom: 5}}>
        <ErrorScreen
          title="Error screen"
          message="A major error occurred that led the entire screen to fail"
          details="Here are some details"
          onPressTryAgain={() => {}}
        />
      </View>
      <View style={{marginBottom: 5}}>
        <ErrorMessage message="This is an error that occurred while things were being done" />
      </View>
      <View style={{marginBottom: 5}}>
        <ErrorMessage
          message="This is an error that occurred while things were being done"
          numberOfLines={1}
        />
      </View>
      <View style={{marginBottom: 5}}>
        <ErrorMessage
          message="This is an error that occurred while things were being done"
          onPressTryAgain={() => {}}
        />
      </View>
      <View style={{marginBottom: 5}}>
        <ErrorMessage
          message="This is an error that occurred while things were being done"
          onPressTryAgain={() => {}}
          numberOfLines={1}
        />
      </View>
    </View>
  )
}

function PaletteView({palette}: {palette: PaletteColorName}) {
  const defaultPal = usePalette('default')
  const pal = usePalette(palette)
  return (
    <View
      style={[
        pal.view,
        pal.border,
        {
          borderWidth: 1,
          padding: 10,
          marginBottom: 5,
        },
      ]}>
      <Text style={[pal.text]}>{palette} colors</Text>
      <Text style={[pal.textLight]}>Light text</Text>
      <Text style={[pal.link]}>Link text</Text>
      {palette !== 'default' && (
        <View style={[defaultPal.view]}>
          <Text style={[pal.textInverted]}>Inverted text</Text>
        </View>
      )}
    </View>
  )
}

function TypographyView() {
  const pal = usePalette('default')
  return (
    <View style={[pal.view]}>
      <Text type="h1" style={[pal.text]}>
        Heading 1
      </Text>
      <Text type="h2" style={[pal.text]}>
        Heading 2
      </Text>
      <Text type="h3" style={[pal.text]}>
        Heading 3
      </Text>
      <Text type="h4" style={[pal.text]}>
        Heading 4
      </Text>
      <Text type="subtitle1" style={[pal.text]}>
        Subtitle 1
      </Text>
      <Text type="subtitle2" style={[pal.text]}>
        Subtitle 2
      </Text>
      <Text type="body1" style={[pal.text]}>
        Body 1
      </Text>
      <Text type="body2" style={[pal.text]}>
        Body 2
      </Text>
      <Text type="button" style={[pal.text]}>
        Button
      </Text>
      <Text type="caption" style={[pal.text]}>
        Caption
      </Text>
      <Text type="overline" style={[pal.text]}>
        Overline
      </Text>
    </View>
  )
}

function EmptyStateView() {
  return <EmptyState icon="bars" message="This is an empty state" />
}

function LoadingPlaceholderView() {
  return (
    <>
      <LoadingPlaceholder.PostLoadingPlaceholder />
      <LoadingPlaceholder.NotificationLoadingPlaceholder />
    </>
  )
}

function ButtonsView() {
  const defaultPal = usePalette('default')
  const buttonStyles = {marginRight: 5}
  return (
    <View style={[defaultPal.view]}>
      <View
        style={{
          flexDirection: 'row',
          marginBottom: 5,
        }}>
        <Button type="primary" label="Primary solid" style={buttonStyles} />
        <Button type="secondary" label="Secondary solid" style={buttonStyles} />
        <Button type="inverted" label="Inverted solid" style={buttonStyles} />
      </View>
      <View style={{flexDirection: 'row'}}>
        <Button
          type="primary-outline"
          label="Primary outline"
          style={buttonStyles}
        />
        <Button
          type="secondary-outline"
          label="Secondary outline"
          style={buttonStyles}
        />
      </View>
      <View style={{flexDirection: 'row'}}>
        <Button
          type="primary-light"
          label="Primary light"
          style={buttonStyles}
        />
        <Button
          type="secondary-light"
          label="Secondary light"
          style={buttonStyles}
        />
      </View>
      <View style={{flexDirection: 'row'}}>
        <Button
          type="default-light"
          label="Default light"
          style={buttonStyles}
        />
      </View>
    </View>
  )
}

const DROPDOWN_ITEMS: DropdownItem[] = [
  {
    icon: ['far', 'paste'],
    label: 'Copy post text',
    onPress() {},
  },
  {
    icon: 'share',
    label: 'Share...',
    onPress() {},
  },
  {
    icon: 'circle-exclamation',
    label: 'Report post',
    onPress() {},
  },
]
function DropdownButtonsView() {
  const defaultPal = usePalette('default')
  return (
    <View style={[defaultPal.view]}>
      <View
        style={{
          marginBottom: 5,
        }}>
        <DropdownButton
          type="primary"
          items={DROPDOWN_ITEMS}
          menuWidth={200}
          label="Primary button"
        />
      </View>
      <View
        style={{
          marginBottom: 5,
        }}>
        <DropdownButton type="bare" items={DROPDOWN_ITEMS} menuWidth={200}>
          <Text>Bare</Text>
        </DropdownButton>
      </View>
    </View>
  )
}

function ToggleButtonsView() {
  const defaultPal = usePalette('default')
  const buttonStyles = {marginBottom: 5}
  const [isSelected, setIsSelected] = React.useState(false)
  const onToggle = () => setIsSelected(!isSelected)
  return (
    <View style={[defaultPal.view]}>
      <ToggleButton
        type="primary"
        label="Primary solid"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="secondary"
        label="Secondary solid"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="inverted"
        label="Inverted solid"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="primary-outline"
        label="Primary outline"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="secondary-outline"
        label="Secondary outline"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="primary-light"
        label="Primary light"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="secondary-light"
        label="Secondary light"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
      <ToggleButton
        type="default-light"
        label="Default light"
        style={buttonStyles}
        isSelected={isSelected}
        onPress={onToggle}
      />
    </View>
  )
}

const RADIO_BUTTON_ITEMS = [
  {key: 'default-light', label: 'Default Light'},
  {key: 'primary', label: 'Primary'},
  {key: 'secondary', label: 'Secondary'},
  {key: 'inverted', label: 'Inverted'},
  {key: 'primary-outline', label: 'Primary Outline'},
  {key: 'secondary-outline', label: 'Secondary Outline'},
  {key: 'primary-light', label: 'Primary Light'},
  {key: 'secondary-light', label: 'Secondary Light'},
]
function RadioButtonsView() {
  const defaultPal = usePalette('default')
  const [rgType, setRgType] = React.useState('default-light')
  return (
    <View style={[defaultPal.view]}>
      <RadioGroup
        type={rgType}
        items={RADIO_BUTTON_ITEMS}
        initialSelection="default-light"
        onSelect={setRgType}
      />
    </View>
  )
}
